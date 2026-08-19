// Матчинг обратной загрузки — то, ради чего существует платформа.
//
// Когда перевозчик открывает заявку A → B, система сразу ищет встречный груз
// C → D, который можно взять тем же рейсом, и показывает в тенге, сколько
// он сэкономит на порожнем возврате. Паттерн Uber Freight / Convoy.
//
// Ни одна казахстанская биржа (ATI.SU, Della, Fa-Fa, CMR24, Jukter, Tasyma)
// этого не делает — максимум ручной фильтр «попутный груз».
//
// Все расстояния берутся ТОЛЬКО из public.distance_matrix. Обращений
// к внешним геосервисам в рантайме нет: публичный OSRM держит 1 запрос
// в секунду и на демо отвалился бы.

import {
  computeBackhaulSaving,
  computeTripCost,
  suggestPrice,
  type BackhaulSaving,
  type BodyType,
  type DistanceMatrix,
  type TripCost,
} from "./economics"

// ─── Пороги подбора ────────────────────────────────────────────────────────
// Вынесены наверх намеренно: это то, что крутится руками на демо, когда
// нужно показать, как меняется выдача.

/** Насколько далеко от точки разгрузки может лежать точка загрузки
 *  обратного груза. Больше — порожняя подача съедает всю выгоду. */
export const MAX_CONNECTION_KM = 60

/** Насколько далеко от исходной точки может закончиться обратный рейс.
 *  Это проверка, что машина действительно возвращается домой, а не уезжает
 *  ещё дальше в область. */
export const MAX_RETURN_DEVIATION_KM = 80

/** Окно от прибытия в точку разгрузки, в котором должен начинаться
 *  обратный рейс. Сутки — водитель может переночевать. */
export const TIME_WINDOW_HOURS = 24

/** Сколько альтернатив показывать помимо лучшей связки. */
const MAX_ALTERNATIVES = 3

/** Сколько перевозчиков отдавать в выдаче. */
const MAX_CARRIERS = 5

// ─── Типы ──────────────────────────────────────────────────────────────────

export interface MatchRequest {
  fromSettlementId: number
  toSettlementId: number
  weightKg: number
  volumeM3?: number
  bodyType: BodyType
  /** ISO-строка: с какого момента груз можно забрать. */
  pickupFrom: string
  /** ISO-строка: до какого момента груз надо забрать. */
  pickupTo: string
  /** Заявка, для которой ищем пару — исключается из кандидатов. */
  excludeOrderId?: number
}

export interface CarrierMatch {
  vehicleId: number
  carrierName: string
  plate: string
  bodyType: BodyType
  capacityKg: number
  /** Порожняя подача от текущей позиции машины до точки загрузки. */
  deadheadToPickupKm: number
  tripCost: TripCost
  suggestedPriceKzt: number
  score: number
}

export interface BackhaulSuggestion {
  orderId: number
  orderNumber: string
  cargoType: string
  fromName: string
  toName: string
  pickupFrom: string
  /** Порожний перегон между разгрузкой прямого рейса и загрузкой обратного. */
  connectionKm: number
  saving: BackhaulSaving
}

export interface MatchResult {
  carriers: CarrierMatch[]
  backhaul: BackhaulSuggestion | null
  alternativeBackhauls: BackhaulSuggestion[]
}

/** Строка автопарка в том виде, в каком её отдаёт Supabase. */
export interface VehicleRow {
  id: number
  vehicle_code: string | null
  plate: string | null
  driver: string | null
  status: string | null
  body_type: string | null
  capacity_kg: number | null
  current_lat: number | null
  current_lng: number | null
  home_settlement_id: number | null
}

/** Строка заявки в том виде, в каком её отдаёт Supabase. */
export interface OrderRow {
  id: number
  order_number: string
  cargo_type: string
  status: string
  weight: number | null
  body_type: string | null
  carrier_id: string | null
  from_settlement_id: number | null
  to_settlement_id: number | null
  pickup_from: string | null
}

export interface SettlementRow {
  id: number
  name: string
  lat: number
  lng: number
}

// ─── Совместимость кузовов ─────────────────────────────────────────────────

/**
 * Может ли машина с кузовом `vehicle` везти груз, требующий `cargo`.
 *
 * Рефрижератор — закрытый кузов с холодильной установкой, поэтому он везёт
 * и обычный тентованный груз. Обратное неверно: продукты в тенте испортятся.
 * Остальные типы взаимозаменяемыми не считаем.
 */
export function bodyTypeCompatible(vehicle: BodyType, cargo: BodyType): boolean {
  if (vehicle === cargo) return true
  if (vehicle === "refrigerator" && cargo === "tent") return true
  return false
}

// ─── Матрица расстояний ────────────────────────────────────────────────────

export interface DistanceRow {
  from_id: number
  to_id: number
  km: number
  minutes: number
}

const EARTH_RADIUS_KM = 6371
/** Во сколько раз дорога длиннее прямой — для пар, которых нет в матрице. */
const DETOUR_FACTOR = 1.35
/** Средняя скорость для оценки времени в фолбэке, км/ч. */
const FALLBACK_SPEED_KMH = 70

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/**
 * Собирает матрицу из строк БД. Если пары нет — считает по гаверсинусу
 * с коэффициентом извилистости и логирует: это сигнал, что distance_matrix
 * заполнена не полностью.
 */
export function buildMatrix(rows: DistanceRow[], settlements: SettlementRow[]): DistanceMatrix {
  const direct = new Map<string, { km: number; minutes: number }>()
  for (const r of rows) {
    direct.set(`${r.from_id}-${r.to_id}`, { km: Number(r.km), minutes: r.minutes })
  }

  const coords = new Map(settlements.map((s) => [s.id, { lat: Number(s.lat), lng: Number(s.lng) }]))

  return {
    get(fromId, toId) {
      if (fromId === toId) return { km: 0, minutes: 0 }

      const hit = direct.get(`${fromId}-${toId}`)
      if (hit) return hit

      const a = coords.get(fromId)
      const b = coords.get(toId)
      if (!a || !b) return null

      const km = Math.round(haversineKm(a, b) * DETOUR_FACTOR * 100) / 100
      console.warn(
        `[matching] пары ${fromId}→${toId} нет в distance_matrix, фолбэк на гаверсинус: ${km} км`,
      )
      return { km, minutes: Math.round((km / FALLBACK_SPEED_KMH) * 60) }
    },
  }
}

// ─── Подбор перевозчика ────────────────────────────────────────────────────

/** Ближайший НП к произвольной точке — чтобы взять расстояние из матрицы. */
function nearestSettlementId(
  point: { lat: number; lng: number },
  settlements: SettlementRow[],
): number | null {
  let best: number | null = null
  let bestKm = Infinity
  for (const s of settlements) {
    const km = haversineKm(point, { lat: Number(s.lat), lng: Number(s.lng) })
    if (km < bestKm) {
      bestKm = km
      best = s.id
    }
  }
  return best
}

/**
 * Подбирает машины под заявку.
 *
 * Фильтры: тип кузова, грузоподъёмность, статус «Свободна».
 * Скор — обратная величина полной стоимости (подача + рейс): чем дешевле
 * обходится рейс, тем выше машина в выдаче.
 */
export function matchCarriers(
  request: MatchRequest,
  vehicles: VehicleRow[],
  matrix: DistanceMatrix,
  settlements: SettlementRow[],
): CarrierMatch[] {
  const leg = matrix.get(request.fromSettlementId, request.toSettlementId)
  if (!leg) return []

  const matches: CarrierMatch[] = []

  for (const v of vehicles) {
    if (v.status !== "Свободна") continue
    if (!v.body_type || !bodyTypeCompatible(v.body_type as BodyType, request.bodyType)) continue

    const capacity = v.capacity_kg ?? 0
    if (capacity < request.weightKg) continue

    // Откуда машина едет за грузом: текущие координаты, иначе домашний НП
    let originId = v.home_settlement_id
    if (v.current_lat != null && v.current_lng != null) {
      originId =
        nearestSettlementId({ lat: Number(v.current_lat), lng: Number(v.current_lng) }, settlements) ??
        originId
    }
    if (originId == null) continue

    const deadhead = matrix.get(originId, request.fromSettlementId) ?? { km: 0, minutes: 0 }

    // Платный участок «Актау – Жетыбай – Шетпе – Бейнеу» учитываем только
    // для тяжёлых машин на длинном плече — короткие внутрирайонные рейсы
    // по нему не идут
    const useToll = leg.km > 270 && capacity >= 15_000

    const tripCost = computeTripCost(
      deadhead.km + leg.km,
      deadhead.minutes + leg.minutes,
      v.body_type as BodyType,
      request.weightKg,
      useToll,
    )

    matches.push({
      vehicleId: v.id,
      carrierName: v.driver ?? v.vehicle_code ?? "Перевозчик",
      plate: v.plate ?? "—",
      bodyType: v.body_type as BodyType,
      capacityKg: capacity,
      deadheadToPickupKm: deadhead.km,
      tripCost,
      suggestedPriceKzt: suggestPrice(leg.km, capacity),
      score: Math.round((1_000_000 / Math.max(1, tripCost.totalKzt)) * 100) / 100,
    })
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, MAX_CARRIERS)
}

// ─── Матчинг обратной загрузки — ядро ──────────────────────────────────────

/**
 * Ищет встречные заявки, которые можно взять тем же рейсом.
 *
 * Кандидат проходит, если одновременно верно:
 *   1. заявка свободна (статус «Ожидает отправки», перевозчик не назначен);
 *   2. это не сама исходная заявка;
 *   3. геометрия: точка загрузки не дальше MAX_CONNECTION_KM от точки
 *      разгрузки прямого рейса;
 *   4. направление: точка разгрузки не дальше MAX_RETURN_DEVIATION_KM
 *      от точки загрузки прямого рейса — машина реально возвращается;
 *   5. время: загрузка попадает в окно от прибытия до прибытия + сутки;
 *   6. кузов совместим;
 *   7. вес помещается.
 *
 * Кандидаты сортируются по сэкономленным тенге.
 */
export function matchBackhaul(
  request: MatchRequest,
  candidates: OrderRow[],
  matrix: DistanceMatrix,
  settlementNames: Map<number, string>,
  capacityKg: number,
): { best: BackhaulSuggestion | null; alternatives: BackhaulSuggestion[] } {
  const outboundLeg = matrix.get(request.fromSettlementId, request.toSettlementId)
  if (!outboundLeg) return { best: null, alternatives: [] }

  // Когда машина освободится в точке разгрузки
  const departure = new Date(request.pickupFrom).getTime()
  const arrival = departure + outboundLeg.minutes * 60_000 * 1.3
  const windowEnd = arrival + TIME_WINDOW_HOURS * 3_600_000

  const suggestions: BackhaulSuggestion[] = []

  for (const order of candidates) {
    if (order.id === request.excludeOrderId) continue
    if (order.carrier_id) continue
    if (order.status !== "Ожидает отправки" && order.status !== "Жіберілуді күтуде") continue
    if (order.from_settlement_id == null || order.to_settlement_id == null) continue

    // Кузов и вес
    const cargoBody = (order.body_type ?? "tent") as BodyType
    if (!bodyTypeCompatible(request.bodyType, cargoBody)) continue
    if ((order.weight ?? 0) > capacityKg) continue

    // Геометрия: подача от разгрузки прямого рейса к загрузке обратного
    const connection = matrix.get(request.toSettlementId, order.from_settlement_id)
    if (!connection || connection.km > MAX_CONNECTION_KM) continue

    // Направление: обратный рейс должен закончиться рядом с началом прямого
    const returnGap = matrix.get(order.to_settlement_id, request.fromSettlementId)
    if (!returnGap || returnGap.km > MAX_RETURN_DEVIATION_KM) continue

    // Время: груз должен быть готов к моменту, когда машина освободится
    if (order.pickup_from) {
      const pickup = new Date(order.pickup_from).getTime()
      if (Number.isFinite(pickup) && (pickup < arrival || pickup > windowEnd)) continue
    }

    const saving = computeBackhaulSaving(
      { fromId: request.fromSettlementId, toId: request.toSettlementId },
      { fromId: order.from_settlement_id, toId: order.to_settlement_id },
      matrix,
      request.bodyType,
      request.weightKg,
    )

    suggestions.push({
      orderId: order.id,
      orderNumber: order.order_number,
      cargoType: order.cargo_type,
      fromName: settlementNames.get(order.from_settlement_id) ?? "—",
      toName: settlementNames.get(order.to_settlement_id) ?? "—",
      pickupFrom: order.pickup_from ?? "",
      connectionKm: connection.km,
      saving,
    })
  }

  suggestions.sort((a, b) => b.saving.kztSaved - a.saving.kztSaved)

  return {
    best: suggestions[0] ?? null,
    alternatives: suggestions.slice(1, 1 + MAX_ALTERNATIVES),
  }
}
