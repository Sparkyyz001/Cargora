// Экономика внутрирегиональной перевозки: во что обходится рейс и сколько
// перевозчик экономит, если вместо порожнего возврата берёт обратный груз.
//
// Все константы проверены 19.08.2026, источники указаны у каждой.
// Цифры не выдуманы и не подогнаны — на них держится весь экономический
// аргумент продукта, и каждую можно перепроверить по ссылке.

export type BodyType = "tent" | "refrigerator" | "dump" | "flatbed" | "manipulator"

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  tent: "Тент",
  refrigerator: "Рефрижератор",
  dump: "Самосвал",
  flatbed: "Бортовой",
  manipulator: "Манипулятор",
}

/** Цена дизеля на АЗС РК, ₸/л. Диапазон 334–345 (findh.org, 19.08.2026).
 *  По Актау отдельных мониторингов нет — берём середину диапазона. */
export const DIESEL_PRICE_KZT = 340

/** Расход топлива, л/100 км. Нормы КамАЗ: 22.3–37 л/100 км (gruzovik.biz).
 *  Автопоезд: +1.3 л/100 км. */
export const FUEL_CONSUMPTION: Record<BodyType, number> = {
  tent: 30, // тент 20 т
  refrigerator: 33, // рефрижератор — плюс холодильная установка
  dump: 35, // самосвал
  flatbed: 30, // борт
  manipulator: 32, // манипулятор
}

/** Средняя ЗП по Мангистауской области, ₸/мес.
 *  БНС, I кв. 2026 — 608 400 ₸, 3-е место в РК (zakon.kz). */
export const AVG_SALARY_KZT = 608_400

/** Час работы водителя: 22 рабочих дня × 8 часов. */
export const DRIVER_HOURLY_KZT = Math.round(AVG_SALARY_KZT / 22 / 8) // 3456

/** Гружёный грузовик едет медленнее легкового, по которому считает OSRM. */
export const TRUCK_TIME_FACTOR = 1.3

/** Рыночные ставки, ₸/км. Биржа DELLA, 18–19.08.2026.
 *  Закономерность: чем короче плечо, тем выше ставка за километр. */
export const MARKET_RATE_KZT_PER_KM = {
  t20: { min: 417, max: 778, typical: 500 },
  t10: { min: 381, max: 645, typical: 480 },
  t5: { min: 212, max: 461, typical: 340 },
} as const

/** Платный участок «Актау – Жетыбай – Шетпе – Бейнеу», 272+ км.
 *  Приказ от 29.07.2025 (informburo.kz). Постоплата. */
export const TOLL_KZT = {
  upTo2_5t: 2_000,
  from5_5to10t: 6_026,
  over15t: 10_061,
} as const

/** Базовая доля порожнего пробега.
 *  Eurostat 2024: внутренние перевозки в ЕС — 25.8%, международные — 12.6%.
 *  По Казахстану исследований не существует (Kazlogistics прямо констатирует
 *  отсутствие статистики). Используем европейский бенчмарк для внутренних. */
export const BASELINE_EMPTY_RUN_SHARE = 0.258

/** Документированное снижение порожняка при автоматическом матчинге:
 *  Convoy Automated Reloads −19%, Uber Freight load bundling −22.6%.
 *  Берём консервативные 20% — заявлять 30–50% нечем подтвердить. */
export const MATCHING_REDUCTION = 0.2

/** Грузовых автомобилей в Мангистауской области.
 *  БНС на 01.03.2026: кат. C — 16 302, кат. C1 — 2 493 (lada.kz). */
export const REGION_TRUCK_COUNT = 18_795

/** Порог массы, с которого включается тариф платного участка для >15 т. */
const TOLL_HEAVY_KG = 15_000
const TOLL_MID_KG = 5_500

export interface TripCost {
  km: number
  hours: number
  fuelLiters: number
  fuelKzt: number
  driverKzt: number
  tollKzt: number
  totalKzt: number
}

/** Плата за платный участок по массе машины. */
export function tollFor(weightKg: number): number {
  if (weightKg > TOLL_HEAVY_KG) return TOLL_KZT.over15t
  if (weightKg >= TOLL_MID_KG) return TOLL_KZT.from5_5to10t
  return TOLL_KZT.upTo2_5t
}

/**
 * Стоимость перегона: топливо + время водителя + платная дорога.
 *
 * `minutes` — время из матрицы расстояний (OSRM считает для легкового авто),
 * поэтому внутри домножается на TRUCK_TIME_FACTOR.
 */
export function computeTripCost(
  km: number,
  minutes: number,
  bodyType: BodyType,
  weightKg: number,
  useToll: boolean,
): TripCost {
  const consumption = FUEL_CONSUMPTION[bodyType]
  const fuelLiters = (km * consumption) / 100
  const fuelKzt = fuelLiters * DIESEL_PRICE_KZT

  const hours = (minutes / 60) * TRUCK_TIME_FACTOR
  const driverKzt = hours * DRIVER_HOURLY_KZT

  const tollKzt = useToll ? tollFor(weightKg) : 0

  return {
    km: round2(km),
    hours: round2(hours),
    fuelLiters: round2(fuelLiters),
    fuelKzt: Math.round(fuelKzt),
    driverKzt: Math.round(driverKzt),
    tollKzt,
    totalKzt: Math.round(fuelKzt + driverKzt + tollKzt),
  }
}

export interface BackhaulSaving {
  /** Порожний пробег без матчинга: машина возвращается пустой B → A. */
  emptyKmWithout: number
  /** Порожний пробег со связкой: короткая подача B → C. */
  emptyKmWith: number
  emptyKmSaved: number
  kztSaved: number
  hoursSaved: number
  fuelLitersSaved: number
}

/** Минимальный интерфейс матрицы — чтобы не тащить сюда клиент Supabase. */
export interface DistanceMatrix {
  /** null, если пары нет — вызывающий код решает, что делать. */
  get(fromId: number, toId: number): { km: number; minutes: number } | null
}

/**
 * Экономия от связки прямого и обратного рейса.
 *
 * Без матчинга: A → B с грузом, затем B → A порожняком.
 * Со связкой:   A → B с грузом, короткая подача B → C, затем C → D с грузом.
 *
 * Экономится разница порожних пробегов. Если C совпадает с B, подачи нет
 * вовсе и порожний пробег схлопывается в ноль.
 */
export function computeBackhaulSaving(
  outbound: { fromId: number; toId: number },
  backhaul: { fromId: number; toId: number },
  matrix: DistanceMatrix,
  bodyType: BodyType,
  weightKg: number,
): BackhaulSaving {
  // Порожний возврат B → A, которого не будет
  const ret = matrix.get(outbound.toId, outbound.fromId)
  // Порожняя подача B → C, которая появится вместо него
  const connection =
    outbound.toId === backhaul.fromId ? { km: 0, minutes: 0 } : matrix.get(outbound.toId, backhaul.fromId)

  const without = ret ?? { km: 0, minutes: 0 }
  const wth = connection ?? { km: 0, minutes: 0 }

  const emptyKmSaved = Math.max(0, without.km - wth.km)
  const minutesSaved = Math.max(0, without.minutes - wth.minutes)

  const costWithout = computeTripCost(without.km, without.minutes, bodyType, weightKg, false)
  const costWith = computeTripCost(wth.km, wth.minutes, bodyType, weightKg, false)

  return {
    emptyKmWithout: round2(without.km),
    emptyKmWith: round2(wth.km),
    emptyKmSaved: round2(emptyKmSaved),
    kztSaved: Math.max(0, costWithout.totalKzt - costWith.totalKzt),
    hoursSaved: round2((minutesSaved / 60) * TRUCK_TIME_FACTOR),
    fuelLitersSaved: round2(costWithout.fuelLiters - costWith.fuelLiters),
  }
}

/** Ставка ₸/км по грузоподъёмности — для оценки стоимости рейса. */
export function marketRatePerKm(capacityKg: number): number {
  if (capacityKg >= 15_000) return MARKET_RATE_KZT_PER_KM.t20.typical
  if (capacityKg >= 8_000) return MARKET_RATE_KZT_PER_KM.t10.typical
  return MARKET_RATE_KZT_PER_KM.t5.typical
}

/** Ориентировочная цена рейса по рыночным ставкам DELLA. */
export function suggestPrice(km: number, capacityKg: number): number {
  return Math.round((km * marketRatePerKm(capacityKg)) / 100) * 100
}

/** Форматирование в тенге для UI: 23712 → «23 712 ₸». */
export function formatKzt(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU").replace(/,/g, " ")} ₸`
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
