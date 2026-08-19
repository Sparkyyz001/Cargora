import { SETTLEMENTS } from "@/lib/mangystau"
import type { BodyType } from "@/lib/economics"
import type { SimTrip } from "@/components/fleet-map"

// Рейсы для симуляции суток по области.
//
// Строятся детерминированно из реальных плеч и реального времени в пути
// (матрица расстояний), поэтому каждый показ выглядит одинаково — на сцене
// не должно быть сюрпризов. Расписание повторяет живой развоз: основная
// волна уходит с 5 до 9 утра, вторая после обеда.

const DRIVERS = ["Ахмет С.", "Батыр Ж.", "Нурлан Б.", "Арман Т.", "Серик К.", "Дауит М."]

/** Машины парка: госномер, кузов, грузоподъёмность. */
const FLEET: { plate: string; bodyType: BodyType; capacityKg: number }[] = [
  { plate: "A 123 BCA 16", bodyType: "refrigerator", capacityKg: 10_000 },
  { plate: "B 456 KMA 16", bodyType: "tent", capacityKg: 20_000 },
  { plate: "C 789 PHA 16", bodyType: "tent", capacityKg: 20_000 },
  { plate: "M 654 OPA 16", bodyType: "dump", capacityKg: 25_000 },
  { plate: "K 987 AXA 16", bodyType: "refrigerator", capacityKg: 5_000 },
  { plate: "P 147 CBA 16", bodyType: "flatbed", capacityKg: 20_000 },
  { plate: "T 258 MHA 16", bodyType: "dump", capacityKg: 25_000 },
  { plate: "R 369 KTA 16", bodyType: "refrigerator", capacityKg: 5_000 },
  { plate: "S 741 BHA 16", bodyType: "manipulator", capacityKg: 12_000 },
  { plate: "N 852 OKA 16", bodyType: "tent", capacityKg: 20_000 },
  { plate: "L 963 PMA 16", bodyType: "tent", capacityKg: 10_000 },
]

const CARGO = [
  "Продукты питания",
  "Стройматериалы",
  "Питьевая вода",
  "Товары народного потребления",
  "Комбикорм",
  "Инертные материалы",
  "Мебель и техника",
  "Оборудование",
]

/** Плечи, по которым в области реально идёт развоз, с весом частоты. */
const LANES: [string, string, number][] = [
  ["Актау", "Жанаозен", 5],
  ["Жанаозен", "Актау", 5],
  ["Актау", "Акшукур", 4],
  ["Акшукур", "Актау", 3],
  ["Актау", "Жетыбай", 3],
  ["Жетыбай", "Актау", 2],
  ["Актау", "Курык", 3],
  ["Курык", "Актау", 3],
  ["Актау", "Шетпе", 2],
  ["Шетпе", "Актау", 2],
  ["Актау", "Мунайшы", 2],
  ["Жанаозен", "Жетыбай", 2],
  ["Жетыбай", "Жанаозен", 2],
  ["Актау", "Форт-Шевченко", 2],
  ["Форт-Шевченко", "Актау", 1],
  ["Актау", "Таушык", 1],
  ["Жанаозен", "Сенек", 1],
  ["Актау", "Уштаган", 1],
  ["Шетпе", "Бейнеу", 1],
  ["Актау", "Бейнеу", 1],
  ["Актау", "Каламкас", 1],
  ["Форт-Шевченко", "Баутино", 1],
]

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type TripMeta = SimTrip & {
  cargo: string
  driver: string
  fromName: string
  toName: string
  km: number
  minutes: number
  plate: string
  bodyType: BodyType
  capacityKg: number
  /** Загрузка машины по этому рейсу, кг. */
  weightKg: number
  /** Порожнее плечо, если возвращаться пустым. */
  returnKm: number
}

/**
 * Собирает расписание суток: `count` рейсов по реальным плечам.
 *
 * `distances` — карта «отId-доId» → { km, minutes } из матрицы расстояний.
 * Время в пути берётся оттуда и умножается на 1.3: OSRM считает для
 * легкового авто, гружёный грузовик едет медленнее.
 */
export function buildSimTrips(
  distances: Map<string, { km: number; minutes: number }>,
  count = 34,
): TripMeta[] {
  const idByName = new Map(SETTLEMENTS.map((s, i) => [s.name, i + 1]))
  const rand = mulberry32(20260820)

  // Разворачиваем плечи по весам, чтобы частые направления встречались чаще
  const pool: [string, string][] = []
  for (const [from, to, weight] of LANES) {
    for (let i = 0; i < weight; i++) pool.push([from, to])
  }

  const trips: TripMeta[] = []

  for (let i = 0; i < count; i++) {
    const [fromName, toName] = pool[Math.floor(rand() * pool.length)]
    const fromId = idByName.get(fromName)
    const toId = idByName.get(toName)
    if (!fromId || !toId) continue

    const leg = distances.get(`${fromId}-${toId}`)
    if (!leg) continue

    // Утренняя волна 5:00–9:30 забирает две трети рейсов, остальные после обеда
    const morning = rand() < 0.65
    const departHour = morning ? 5 + rand() * 4.5 : 13 + rand() * 4

    const vehicle = FLEET[Math.floor(rand() * FLEET.length)]
    const back = distances.get(`${toId}-${fromId}`)

    trips.push({
      id: i + 1,
      label: `${fromName} → ${toName}`,
      fromId,
      toId,
      departHour: Math.round(departHour * 100) / 100,
      durationHours: Math.max(0.4, Math.round((leg.minutes / 60) * 1.3 * 100) / 100),
      cargo: CARGO[Math.floor(rand() * CARGO.length)],
      driver: DRIVERS[Math.floor(rand() * DRIVERS.length)],
      fromName,
      toName,
      km: leg.km,
      minutes: leg.minutes,
      plate: vehicle.plate,
      bodyType: vehicle.bodyType,
      capacityKg: vehicle.capacityKg,
      // Загрузка 55–95% от грузоподъёмности — машины редко ходят полными
      weightKg: Math.round(vehicle.capacityKg * (0.55 + rand() * 0.4)),
      returnKm: back?.km ?? leg.km,
    })
  }

  return trips.sort((a, b) => a.departHour - b.departHour)
}
