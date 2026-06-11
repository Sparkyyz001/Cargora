// Загруженность пунктов пропуска и порта «в реальном времени».
// Данные синтетические, но живые: меняются каждые 10 минут и следуют
// суточному профилю (утренний и дневной пики), значения стабильны
// между перерисовками внутри одного 10-минутного окна.

export type CheckpointLoad = {
  id: string
  name: string
  kind: string
  queue: number
  unit: string
  waitHours: number
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

// Суточный профиль загруженности: ночь тихая, пики утром и после обеда
function hourFactor(hour: number) {
  if (hour >= 8 && hour <= 11) return 1.0
  if (hour >= 14 && hour <= 18) return 0.9
  if (hour >= 6 && hour < 8) return 0.7
  if (hour >= 12 && hour < 14) return 0.75
  if (hour >= 19 && hour <= 22) return 0.55
  return 0.35
}

// Формы единиц: [1, 2–4, 5+] — «3 судна», но «6 судов»
const POINTS = [
  { id: "aktau-port", name: "Порт Актау", kind: "морской порт", baseQueue: 6, units: ["судно", "судна", "судов"], baseWait: 7, baseLoad: 82 },
  { id: "bolashak", name: "КПП «Болашак»", kind: "граница, Туркменистан", baseQueue: 70, units: ["фура", "фуры", "фур"], baseWait: 6, baseLoad: 88 },
  { id: "tazhen", name: "КПП «Тажен»", kind: "граница, Туркменистан", baseQueue: 45, units: ["фура", "фуры", "фур"], baseWait: 4, baseLoad: 64 },
  { id: "beineu", name: "Ж/д узел Бейнеу", kind: "железная дорога", baseQueue: 8, units: ["состав", "состава", "составов"], baseWait: 5, baseLoad: 71 },
]

function plural(n: number, forms: string[]) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

function loadAt(bucket: number, hour: number) {
  return POINTS.map((p, i) => {
    const rand = mulberry32(bucket * 31 + i * 7919)
    const f = hourFactor(hour) * (0.85 + rand() * 0.3)
    return {
      ...p,
      queue: Math.max(1, Math.round(p.baseQueue * f)),
      waitHours: Math.max(1, Math.round(p.baseWait * f * 10) / 10),
      loadPct: Math.min(98, Math.max(15, Math.round(p.baseLoad * f))),
    }
  })
}

export function getCheckpointLoad(): CheckpointLoad[] {
  const now = new Date()
  // Часовой пояс Актау (UTC+5) — суточный профиль не должен зависеть от TZ сервера
  const aktau = new Date(now.getTime() + (5 * 60 + now.getTimezoneOffset()) * 60000)
  const bucket = Math.floor(now.getTime() / 600000) // окно 10 минут
  const current = loadAt(bucket, aktau.getHours())
  const previous = loadAt(bucket - 1, aktau.getHours())

  return current.map((p, i) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    queue: p.queue,
    unit: plural(p.queue, p.units),
    waitHours: p.waitHours,
    loadPct: p.loadPct,
    trend: p.loadPct >= previous[i].loadPct ? "up" : "down",
  }))
}
