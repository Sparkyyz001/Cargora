// Инференс ML-модели прогноза спроса на перевозки по направлениям области.
//
// Модель (GradientBoostingRegressor) обучена в ml/train.py на датасете
// ml/data/direction_demand.csv и экспортирована в lib/forecast-model.json.
// Здесь — ручной проход по деревьям: prediction = init + lr * Σ tree(x).
// Благодаря этому прогноз работает в обычном Next.js route handler на Vercel,
// без отдельного Python-сервиса.
//
// ВАЖНО: порядок и кодировка признаков обязаны бит-в-бит совпадать с
// build_features() в ml/train.py (час/день недели — по времени Актау, UTC+5;
// день недели — Пн=0 как в pandas).

import model from "./forecast-model.json" with { type: "json" }

export type ForecastPoint = {
  ts: string
  /** Ожидаемое число заявок в час на направлении. */
  orders: number
}

export type DirectionForecast = {
  id: string
  name: string
  /** Плечо, км — из матрицы расстояний. */
  km: number
  current: ForecastPoint
  hours: ForecastPoint[]
  /** Сколько заявок ожидается за сутки вперёд. */
  ordersNext24h: number
  /** Час пик: когда спрос максимальный. */
  peak: { ts: string; orders: number }
  /** Машин заявлено на направление. */
  vehiclesDeclared: number
  /** Сколько рейсов машина успевает сделать за сутки на этом плече. */
  tripsPerDay: number
  /** Сколько заявок эти машины закроют за сутки. */
  capacityNext24h: number
  /** Незакрытых заявок за сутки. */
  deficit: number
}

// Порядок обязан совпадать с DIRECTION_IDS в ml/train.py
const DIRECTION_IDS = [
  "aktau-zhanaozen",
  "zhanaozen-aktau",
  "aktau-shetpe",
  "shetpe-aktau",
  "aktau-kuryk",
  "kuryk-aktau",
  "aktau-fort-shevchenko",
  "aktau-beineu",
  "aktau-zhetybai",
  "zhanaozen-zhetybai",
] as const

// Названия и плечи — фактические значения из public.distance_matrix.
// vehiclesDeclared — сколько машин перевозчики заявили на направление.
const DIRECTIONS = [
  { id: "aktau-zhanaozen", name: "Актау → Жанаозен", km: 150.7, vehiclesDeclared: 24 },
  { id: "zhanaozen-aktau", name: "Жанаозен → Актау", km: 150.7, vehiclesDeclared: 31 },
  { id: "aktau-shetpe", name: "Актау → Шетпе", km: 162.9, vehiclesDeclared: 14 },
  { id: "shetpe-aktau", name: "Шетпе → Актау", km: 162.9, vehiclesDeclared: 18 },
  { id: "aktau-kuryk", name: "Актау → Курык", km: 71.0, vehiclesDeclared: 12 },
  { id: "kuryk-aktau", name: "Курык → Актау", km: 71.0, vehiclesDeclared: 15 },
  { id: "aktau-fort-shevchenko", name: "Актау → Форт-Шевченко", km: 144.6, vehiclesDeclared: 9 },
  { id: "aktau-beineu", name: "Актау → Бейнеу", km: 469.5, vehiclesDeclared: 16 },
  { id: "aktau-zhetybai", name: "Актау → Жетыбай", km: 93.4, vehiclesDeclared: 11 },
  { id: "zhanaozen-zhetybai", name: "Жанаозен → Жетыбай", km: 75.9, vehiclesDeclared: 8 },
] as const

/**
 * Сколько рейсов машина успевает сделать за сутки на плече длиной `km`.
 *
 * Считаем поездку туда-обратно плюс погрузку-разгрузку. Скорость гружёного
 * грузовика по области — около 60 км/ч, смена водителя 10 часов.
 * На коротком плече внутри агломерации машина оборачивается трижды,
 * на Бейнеу (469 км) не успевает и одного круга в сутки.
 */
function tripsPerDay(km: number): number {
  const roundTripHours = (2 * km) / 60 + 1.5 // 1.5 ч на погрузку и выгрузку
  return Math.round((10 / roundTripHours) * 10) / 10
}

const KZ_HOLIDAYS = new Set([
  "1-1", "1-2", "3-8", "3-21", "3-22", "3-23",
  "5-1", "5-7", "5-9", "7-6", "8-30", "10-25", "12-16",
])

type Tree = { f: number[]; t: number[]; l: number[]; r: number[]; v: number[] }

function evalTree(tree: Tree, x: number[]): number {
  let node = 0
  while (tree.l[node] !== -1) {
    node = x[tree.f[node]] <= tree.t[node] ? tree.l[node] : tree.r[node]
  }
  return tree.v[node]
}

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0)
  return Math.floor((d.getTime() - start) / 86400000)
}

// Признаки для момента времени `utc` (часовой пояс Актау UTC+5 учитывается здесь)
function buildFeatures(utc: Date, directionId: string, windMs: number, tempC: number): number[] {
  const aktau = new Date(utc.getTime() + 5 * 3600000)
  const hour = aktau.getUTCHours()
  const dow = (aktau.getUTCDay() + 6) % 7 // Пн=0, как pandas dayofweek
  const doy = dayOfYear(aktau)
  const isHoliday = KZ_HOLIDAYS.has(`${aktau.getUTCMonth() + 1}-${aktau.getUTCDate()}`) ? 1 : 0

  return [
    Math.sin((2 * Math.PI * hour) / 24),
    Math.cos((2 * Math.PI * hour) / 24),
    dow,
    dow >= 5 ? 1 : 0,
    Math.sin((2 * Math.PI * doy) / 365.25),
    Math.cos((2 * Math.PI * doy) / 365.25),
    windMs,
    tempC,
    isHoliday,
    ...DIRECTION_IDS.map((d) => (d === directionId ? 1 : 0)),
  ]
}

/** Ожидаемое число заявок в час на направлении. */
export function predictDemand(
  utc: Date,
  directionId: string,
  windMs: number,
  tempC: number,
): number {
  const x = buildFeatures(utc, directionId, windMs, tempC)
  let sum = model.init
  for (const tree of model.trees as Tree[]) {
    sum += model.learning_rate * evalTree(tree, x)
  }
  return Math.max(0, Math.round(sum * 100) / 100)
}

export type HourlyWeather = { ts: Date; windMs: number; tempC: number }

/**
 * Прогноз спроса на горизонт `weather.length` часов по всем направлениям.
 *
 * Главный вывод для перевозчика — дефицит: сколько заявок ожидается за сутки
 * против того, сколько машин на направление заявлено. Именно это превращает
 * модель из украшения в рабочий инструмент: «завтра на Актау → Жанаозен
 * ожидается 14 заявок, машин заявлено 9 — там дефицит».
 */
export function forecastDirections(weather: HourlyWeather[]): DirectionForecast[] {
  return DIRECTIONS.map((d) => {
    const hours: ForecastPoint[] = weather.map((w) => ({
      ts: w.ts.toISOString(),
      orders: predictDemand(w.ts, d.id, w.windMs, w.tempC),
    }))

    let peakIdx = 0
    for (let i = 0; i < hours.length; i++) {
      if (hours[i].orders > hours[peakIdx].orders) peakIdx = i
    }

    const ordersNext24h = Math.round(
      hours.slice(0, 24).reduce((sum, h) => sum + h.orders, 0),
    )

    // Дефицит — это незакрытые заявки, а не разница «заявки минус машины»:
    // одна машина на коротком плече закрывает несколько заявок за сутки.
    const trips = tripsPerDay(d.km)
    const capacityNext24h = Math.round(d.vehiclesDeclared * trips)

    return {
      id: d.id,
      name: d.name,
      km: d.km,
      current: hours[0],
      hours,
      ordersNext24h,
      peak: { ts: hours[peakIdx].ts, orders: hours[peakIdx].orders },
      vehiclesDeclared: d.vehiclesDeclared,
      tripsPerDay: trips,
      capacityNext24h,
      deficit: Math.max(0, ordersNext24h - capacityNext24h),
    }
  })
}

export const modelMetrics = model.metrics
