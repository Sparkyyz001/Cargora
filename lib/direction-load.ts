// Загруженность направлений внутри Мангистауской области «в реальном времени».
//
// Показывает по ключевым внутрирегиональным плечам: сколько заявок ждёт
// машину, сколько машин заявлено, есть ли дефицит. Данные синтетические,
// но живые: меняются каждые 10 минут и следуют суточному профилю развоза
// (утренний пик 06:00–10:00, дневной 14:00–17:00, ночью почти ноль).
// Значения стабильны между перерисовками внутри одного 10-минутного окна.
//
// Это витрина: настоящий почасовой прогноз считает ML-модель в lib/forecast.ts.

export type DirectionLoad = {
  id: string
  /** Куда и откуда: «Актау → Жанаозен». */
  name: string
  /** Плечо в километрах — из матрицы расстояний. */
  km: number
  /** Заявок ждёт машину. */
  pending: number
  /** Машин заявлено на направление. */
  vehicles: number
  /** Дефицит машин: заявок больше, чем машин. */
  deficit: number
  /** Насколько направление загружено относительно своей нормы, %. */
  loadPct: number
  trend: "up" | "down"
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Суточный профиль развоза: пик утром, второй после обеда, ночью тихо
function hourFactor(hour: number) {
  if (hour >= 6 && hour <= 10) return 1.0
  if (hour >= 14 && hour <= 17) return 0.9
  if (hour >= 11 && hour < 14) return 0.75
  if (hour >= 18 && hour <= 21) return 0.5
  return 0.25
}

// Ключевые внутрирегиональные направления. Километры — фактические
// значения из public.distance_matrix (OSRM по дорожному графу OSM).
const DIRECTIONS = [
  { id: "aktau-zhanaozen", name: "Актау → Жанаозен", km: 150.7, baseOrders: 14, baseVehicles: 9 },
  { id: "aktau-akshukur", name: "Актау → Акшукур", km: 23.8, baseOrders: 11, baseVehicles: 8 },
  { id: "aktau-zhetybai", name: "Актау → Жетыбай", km: 93.4, baseOrders: 9, baseVehicles: 6 },
  { id: "aktau-kuryk", name: "Актау → Курык", km: 71.0, baseOrders: 8, baseVehicles: 6 },
] as const

function loadAt(bucket: number, hour: number) {
  return DIRECTIONS.map((d, i) => {
    const rand = mulberry32(bucket * 31 + i * 7919)
    const f = hourFactor(hour) * (0.85 + rand() * 0.3)

    const pending = Math.max(1, Math.round(d.baseOrders * f))
    // Машины подтягиваются медленнее, чем растёт спрос — отсюда дефицит
    const vehicles = Math.max(1, Math.round(d.baseVehicles * (0.7 + f * 0.4)))

    return {
      ...d,
      pending,
      vehicles,
      deficit: Math.max(0, pending - vehicles),
      loadPct: Math.min(99, Math.max(12, Math.round((pending / Math.max(1, vehicles)) * 55))),
    }
  })
}

export function getDirectionLoad(): DirectionLoad[] {
  const now = new Date()
  // Часовой пояс Актау (UTC+5) — суточный профиль не должен зависеть от TZ сервера
  const aktau = new Date(now.getTime() + (5 * 60 + now.getTimezoneOffset()) * 60000)
  const bucket = Math.floor(now.getTime() / 600000) // окно 10 минут
  const current = loadAt(bucket, aktau.getHours())
  const previous = loadAt(bucket - 1, aktau.getHours())

  return current.map((d, i) => ({
    id: d.id,
    name: d.name,
    km: d.km,
    pending: d.pending,
    vehicles: d.vehicles,
    deficit: d.deficit,
    loadPct: d.loadPct,
    trend: d.loadPct >= previous[i].loadPct ? "up" : "down",
  }))
}
