// Инференс ML-модели прогноза загруженности пунктов пропуска.
//
// Модель (GradientBoostingRegressor) обучена в ml/train.py на датасете
// ml/data/checkpoint_traffic.csv и экспортирована в lib/forecast-model.json.
// Здесь — ручной проход по деревьям: prediction = init + lr * Σ tree(x).
// Благодаря этому прогноз работает в обычном Next.js route handler на Vercel,
// без отдельного Python-сервиса.
//
// ВАЖНО: порядок и кодировка признаков обязаны бит-в-бит совпадать с
// build_features() в ml/train.py (час/день недели — по времени Актау, UTC+5;
// день недели — Пн=0 как в pandas).

import model from "./forecast-model.json"

export type ForecastPoint = {
  ts: string
  loadPct: number
  waitHours: number
  queue: number
}

export type CheckpointForecast = {
  id: string
  name: string
  kind: string
  unit: string
  current: ForecastPoint
  hours: ForecastPoint[]
  bestWindow: { start: string; end: string; avgLoad: number }
  peak: { ts: string; loadPct: number }
}

// Согласовано с lib/checkpoint-load.ts — очередь и ожидание выводятся из
// прогнозной загрузки через те же базовые соотношения
const POINTS = [
  { id: "aktau-port", name: "Порт Актау", kind: "морской порт", baseQueue: 6, unit: "судов", baseWait: 7, baseLoad: 82 },
  { id: "bolashak", name: "КПП «Болашак»", kind: "граница, Туркменистан", baseQueue: 70, unit: "фур", baseWait: 6, baseLoad: 88 },
  { id: "tazhen", name: "КПП «Тажен»", kind: "граница, Туркменистан", baseQueue: 45, unit: "фур", baseWait: 4, baseLoad: 64 },
  { id: "beineu", name: "Ж/д узел Бейнеу", kind: "железная дорога", baseQueue: 8, unit: "составов", baseWait: 5, baseLoad: 71 },
] as const

const KZ_HOLIDAYS = new Set([
  "1-1", "1-2", "3-8", "3-21", "3-22", "3-23",
  "5-1", "5-7", "5-9", "7-6", "8-30", "10-25", "12-16",
])

const CHECKPOINT_IDS = ["aktau-port", "bolashak", "tazhen", "beineu"]

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
function buildFeatures(utc: Date, checkpointId: string, windMs: number, tempC: number): number[] {
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
    ...CHECKPOINT_IDS.map((c) => (c === checkpointId ? 1 : 0)),
  ]
}

export function predictLoad(utc: Date, checkpointId: string, windMs: number, tempC: number): number {
  const x = buildFeatures(utc, checkpointId, windMs, tempC)
  let sum = model.init
  for (const tree of model.trees as Tree[]) {
    sum += model.learning_rate * evalTree(tree, x)
  }
  return Math.min(100, Math.max(8, Math.round(sum * 10) / 10))
}

export type HourlyWeather = { ts: Date; windMs: number; tempC: number }

// Прогноз на горизонт `weather.length` часов для всех пунктов + рекомендация
// лучшего 4-часового окна прохождения (минимальная средняя загрузка)
export function forecastCheckpoints(weather: HourlyWeather[]): CheckpointForecast[] {
  return POINTS.map((p) => {
    const hours: ForecastPoint[] = weather.map((w) => {
      const loadPct = predictLoad(w.ts, p.id, w.windMs, w.tempC)
      return {
        ts: w.ts.toISOString(),
        loadPct,
        waitHours: Math.max(0.5, Math.round((p.baseWait * loadPct) / p.baseLoad * 10) / 10),
        queue: Math.max(1, Math.round((p.baseQueue * loadPct) / p.baseLoad)),
      }
    })

    const windowSize = 4
    let bestStart = 0
    let bestAvg = Infinity
    let peakIdx = 0
    for (let i = 0; i < hours.length; i++) {
      if (hours[i].loadPct > hours[peakIdx].loadPct) peakIdx = i
      if (i + windowSize <= hours.length) {
        const avg = hours.slice(i, i + windowSize).reduce((s, h) => s + h.loadPct, 0) / windowSize
        if (avg < bestAvg) {
          bestAvg = avg
          bestStart = i
        }
      }
    }

    return {
      id: p.id,
      name: p.name,
      kind: p.kind,
      unit: p.unit,
      current: hours[0],
      hours,
      bestWindow: {
        start: hours[bestStart].ts,
        end: hours[Math.min(bestStart + windowSize, hours.length) - 1].ts,
        avgLoad: Math.round(bestAvg * 10) / 10,
      },
      peak: { ts: hours[peakIdx].ts, loadPct: hours[peakIdx].loadPct },
    }
  })
}

export const modelMetrics = model.metrics
