import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
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
import type { BodyType } from "@/lib/economics"

// POST /api/match — подбор машины и обратной загрузки под заявку.
//
// Расстояния берутся только из public.distance_matrix: во время демо
// никаких обращений к OSRM быть не должно. Ответ укладывается в сотни
// миллисекунд — вся работа это три select и арифметика в памяти.

const BODY_TYPES: BodyType[] = ["tent", "refrigerator", "dump", "flatbed", "manipulator"]

const FREE_STATUSES = ["Ожидает отправки", "Жіберілуді күтуде"]

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: "Требуется авторизация" }, { status: 401 })
  }

  let body: Partial<MatchRequest>
  try {
    body = await req.json()
  } catch {
    return badRequest("Тело запроса не является JSON")
  }

  const fromId = Number(body.fromSettlementId)
  const toId = Number(body.toSettlementId)
  const weightKg = Number(body.weightKg)

  if (!Number.isFinite(fromId) || !Number.isFinite(toId)) {
    return badRequest("Не указаны точки погрузки и разгрузки")
  }
  if (fromId === toId) {
    return badRequest("Точки погрузки и разгрузки совпадают")
  }
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return badRequest("Не указан вес груза")
  }

  const bodyType = (body.bodyType ?? "tent") as BodyType
  if (!BODY_TYPES.includes(bodyType)) {
    return badRequest(`Неизвестный тип кузова: ${body.bodyType}`)
  }

  const pickupFrom = body.pickupFrom ?? new Date().toISOString()
  const pickupTo = body.pickupTo ?? new Date(Date.now() + 86_400_000).toISOString()

  const request: MatchRequest = {
    fromSettlementId: fromId,
    toSettlementId: toId,
    weightKg,
    volumeM3: body.volumeM3,
    bodyType,
    pickupFrom,
    pickupTo,
    excludeOrderId: body.excludeOrderId,
  }

  // Три параллельных чтения — справочник, матрица, кандидаты и автопарк
  const [settlementsRes, matrixRes, vehiclesRes, ordersRes] = await Promise.all([
    supabase.from("settlements").select("id,name,lat,lng"),
    supabase.from("distance_matrix").select("from_id,to_id,km,minutes"),
    supabase
      .from("vehicles")
      .select("id,vehicle_code,plate,driver,status,body_type,capacity_kg,current_lat,current_lng,home_settlement_id")
      .eq("status", "Свободна"),
    supabase
      .from("orders")
      .select("id,order_number,cargo_type,status,weight,body_type,carrier_id,from_settlement_id,to_settlement_id,pickup_from")
      .in("status", FREE_STATUSES)
      .is("carrier_id", null)
      .limit(200),
  ])

  const firstError =
    settlementsRes.error ?? matrixRes.error ?? vehiclesRes.error ?? ordersRes.error
  if (firstError) {
    console.error("[match] чтение из БД не удалось:", firstError.message)
    return NextResponse.json({ ok: false, error: "База недоступна" }, { status: 500 })
  }

  const settlements = (settlementsRes.data ?? []) as SettlementRow[]
  const matrix = buildMatrix((matrixRes.data ?? []) as DistanceRow[], settlements)
  const names = new Map(settlements.map((s) => [s.id, s.name]))

  const carriers = matchCarriers(request, (vehiclesRes.data ?? []) as VehicleRow[], matrix, settlements)

  // Грузоподъёмность для отбора обратной загрузки берём у лучшей машины —
  // если машин нет, ориентируемся на вес самой заявки
  const capacityKg = carriers[0]?.capacityKg ?? weightKg

  const { best, alternatives } = matchBackhaul(
    request,
    (ordersRes.data ?? []) as OrderRow[],
    matrix,
    names,
    capacityKg,
  )

  const leg = matrix.get(fromId, toId)

  const result: MatchResult & { ok: true; distanceKm: number; minutes: number } = {
    ok: true,
    distanceKm: leg?.km ?? 0,
    minutes: leg?.minutes ?? 0,
    carriers,
    backhaul: best,
    alternativeBackhauls: alternatives,
  }

  return NextResponse.json(result)
}
