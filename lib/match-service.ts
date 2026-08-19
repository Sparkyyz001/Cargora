import "server-only"

import {
  buildMatrix,
  matchBackhaul,
  matchCarriers,
  type DistanceRow,
  type MatchRequest,
  type MatchResult,
  type OrderRow,
  type SettlementRow,
  type VehicleRow,
} from "@/lib/matching"

// Общая часть подбора для /api/match и /api/ai-route: читает справочник,
// матрицу расстояний, свободные машины и свободные заявки, затем считает
// подбор в памяти. Никаких обращений к внешним геосервисам — во время демо
// это гарантированно быстро и не зависит от чужих рейт-лимитов.

const FREE_STATUSES = ["Ожидает отправки", "Жіберілуді күтуде"]

/** Минимальный интерфейс клиента Supabase, который нам нужен. */
type SupabaseLike = {
  from: (table: string) => any
}

export type MatchServiceResult = MatchResult & {
  distanceKm: number
  minutes: number
  /** Названия НП по id — чтобы вызывающий код не читал справочник повторно. */
  settlementNames: Map<number, string>
}

export async function runMatch(
  supabase: SupabaseLike,
  request: MatchRequest,
): Promise<MatchServiceResult | { error: string }> {
  const [settlementsRes, matrixRes, vehiclesRes, ordersRes] = await Promise.all([
    supabase.from("settlements").select("id,name,lat,lng"),
    supabase.from("distance_matrix").select("from_id,to_id,km,minutes"),
    supabase
      .from("vehicles")
      .select(
        "id,vehicle_code,plate,driver,status,body_type,capacity_kg,current_lat,current_lng,home_settlement_id",
      )
      .eq("status", "Свободна"),
    supabase
      .from("orders")
      .select(
        "id,order_number,cargo_type,status,weight,body_type,carrier_id,from_settlement_id,to_settlement_id,pickup_from",
      )
      .in("status", FREE_STATUSES)
      .is("carrier_id", null)
      .limit(200),
  ])

  const firstError = settlementsRes.error ?? matrixRes.error ?? vehiclesRes.error ?? ordersRes.error
  if (firstError) {
    console.error("[match-service] чтение из БД не удалось:", firstError.message)
    return { error: "База недоступна" }
  }

  const settlements = (settlementsRes.data ?? []) as SettlementRow[]
  const matrix = buildMatrix((matrixRes.data ?? []) as DistanceRow[], settlements)
  const settlementNames = new Map(settlements.map((s) => [s.id, s.name]))

  const carriers = matchCarriers(
    request,
    (vehiclesRes.data ?? []) as VehicleRow[],
    matrix,
    settlements,
  )

  // Грузоподъёмность для отбора обратной загрузки берём у лучшей машины;
  // если свободных машин нет — ориентируемся на вес самой заявки
  const capacityKg = carriers[0]?.capacityKg ?? request.weightKg

  const { best, alternatives } = matchBackhaul(
    request,
    (ordersRes.data ?? []) as OrderRow[],
    matrix,
    settlementNames,
    capacityKg,
  )

  const leg = matrix.get(request.fromSettlementId, request.toSettlementId)

  return {
    distanceKm: leg?.km ?? 0,
    minutes: leg?.minutes ?? 0,
    carriers,
    backhaul: best,
    alternativeBackhauls: alternatives,
    settlementNames,
  }
}
