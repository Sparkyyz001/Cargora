// Сквозная проверка матчинга на реальных данных из БД.
//
//   node scripts/check-matching.ts
//
// Берёт справочник НП и матрицу расстояний из Supabase, собирает ту самую
// пару заявок, которая заложена в демо-сид, и проверяет, что алгоритм
// действительно находит связку и считает по ней экономию.
//
// Это защита от самого неприятного сценария: на сцене перевозчик открывает
// заявку, а карточка обратной загрузки не появляется.

import { readFileSync } from "node:fs"

import { buildMatrix, matchBackhaul, matchCarriers, type OrderRow, type SettlementRow, type VehicleRow } from "../lib/matching"
import { formatKzt } from "../lib/economics"

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

const env = loadEnv()
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function rest<T>(path: string): Promise<T> {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!res.ok) throw new Error(`${res.status} ${path}: ${await res.text()}`)
  return res.json() as Promise<T>
}

let failed = 0
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`)
}

async function main() {
  const settlements = await rest<SettlementRow[]>("settlements?select=id,name,lat,lng&order=id")
  const matrixRows = await rest<{ from_id: number; to_id: number; km: number; minutes: number }[]>(
    "distance_matrix?select=from_id,to_id,km,minutes",
  )

  console.log(`Справочник: ${settlements.length} НП, матрица: ${matrixRows.length} пар\n`)
  check("справочник заполнен", settlements.length === 15, `${settlements.length} из 15`)
  check("матрица полная", matrixRows.length === 210, `${matrixRows.length} из 210`)

  const byName = new Map(settlements.map((s) => [s.name, s.id]))
  const names = new Map(settlements.map((s) => [s.id, s.name]))
  const matrix = buildMatrix(matrixRows, settlements)

  const aktau = byName.get("Актау")!
  const zhanaozen = byName.get("Жанаозен")!

  const leg = matrix.get(aktau, zhanaozen)!
  console.log(`\nПлечо Актау → Жанаозен: ${leg.km} км, ${leg.minutes} мин`)
  check("расстояние близко к эталону ТЗ", Math.abs(leg.km - 149.5) / 149.5 <= 0.05, `${leg.km} км против 149.5`)

  // Заявка из демо-сида: продукты в рефрижераторе, забрать завтра к 08:00
  const tomorrow8 = new Date()
  tomorrow8.setDate(tomorrow8.getDate() + 1)
  tomorrow8.setUTCHours(3, 0, 0, 0) // 08:00 по Актау

  const tomorrow14 = new Date(tomorrow8)
  tomorrow14.setUTCHours(9, 0, 0, 0) // 14:00 по Актау

  const request = {
    fromSettlementId: aktau,
    toSettlementId: zhanaozen,
    weightKg: 3000,
    bodyType: "refrigerator" as const,
    pickupFrom: tomorrow8.toISOString(),
    pickupTo: new Date(tomorrow8.getTime() + 3 * 3600_000).toISOString(),
    excludeOrderId: 1,
  }

  // Встречный груз из того же сида
  const candidates: OrderRow[] = [
    {
      id: 2,
      order_number: "МАН-00145",
      cargo_type: "Рыбная продукция",
      status: "Ожидает отправки",
      weight: 2600,
      body_type: "refrigerator",
      carrier_id: null,
      from_settlement_id: zhanaozen,
      to_settlement_id: aktau,
      pickup_from: tomorrow14.toISOString(),
    },
    // Шум: заявка не в ту сторону — не должна выбираться
    {
      id: 3,
      order_number: "МАН-09999",
      cargo_type: "Комбикорм",
      status: "Ожидает отправки",
      weight: 5000,
      body_type: "tent",
      carrier_id: null,
      from_settlement_id: byName.get("Бейнеу")!,
      to_settlement_id: byName.get("Шетпе")!,
      pickup_from: tomorrow14.toISOString(),
    },
  ]

  const vehicles: VehicleRow[] = [
    {
      id: 1, vehicle_code: "АКТ-01", plate: "A 123 BCA 16", driver: "Ахмет С.",
      status: "Свободна", body_type: "refrigerator", capacity_kg: 10000,
      current_lat: 43.6353, current_lng: 51.1682, home_settlement_id: aktau,
    },
    {
      id: 2, vehicle_code: "ЖАН-06", plate: "K 987 AXA 16", driver: "Дауит М.",
      status: "Свободна", body_type: "refrigerator", capacity_kg: 5000,
      current_lat: 43.3381, current_lng: 52.8556, home_settlement_id: zhanaozen,
    },
  ]

  console.log("\nПодбор машины:")
  const carriers = matchCarriers(request, vehicles, matrix, settlements)
  check("нашлась хотя бы одна машина", carriers.length > 0, `${carriers.length} шт.`)
  if (carriers[0]) {
    const c = carriers[0]
    console.log(`  лучшая: ${c.plate}, подача ${c.deadheadToPickupKm} км, рейс ${formatKzt(c.suggestedPriceKzt)}`)
    check("машина из Актау выигрывает у машины из Жанаозена", c.plate === "A 123 BCA 16", c.plate)
  }

  console.log("\nМатчинг обратной загрузки:")
  const { best, alternatives } = matchBackhaul(request, candidates, matrix, names, 10000)

  check("связка найдена", best !== null)
  if (best) {
    console.log(`  груз: ${best.cargoType}, ${best.fromName} → ${best.toName}`)
    console.log(`  порожний пробег ${best.saving.emptyKmWithout} км → ${best.saving.emptyKmWith} км`)
    console.log(`  экономия ${formatKzt(best.saving.kztSaved)}, топлива ${best.saving.fuelLitersSaved} л`)

    check("выбран именно встречный груз", best.orderNumber === "МАН-00145", best.orderNumber)
    check("подача нулевая", best.connectionKm === 0, `${best.connectionKm} км`)
    // Эталон ТЗ 23 712 ₸ посчитан для тента (30 л/100 км) — он проверяется
    // в scripts/check-economics.ts. Здесь связку везёт рефрижератор:
    // 33 л/100 км из-за холодильной установки, поэтому потери выше.
    // 150.68 км × 0.33 × 340 ₸ = 16 905 ₸ топлива + 2.47 ч × 3 457 ₸ = 8 539 ₸.
    const expectedRefrigerator = 25_445
    check(
      "экономия сходится с расчётом для рефрижератора",
      Math.abs(best.saving.kztSaved - expectedRefrigerator) / expectedRefrigerator <= 0.01,
      `${best.saving.kztSaved} ₸ против ${expectedRefrigerator} ₸`,
    )
    check(
      "экономия выше эталона для тента — у рефрижератора расход больше",
      best.saving.kztSaved > 23712,
      `${best.saving.kztSaved} ₸ против 23 712 ₸ у тента`,
    )
  }
  check("посторонняя заявка отброшена", alternatives.every((a) => a.orderNumber !== "МАН-09999"))

  console.log(failed === 0 ? "\nВсе проверки пройдены." : `\n${failed} проверок провалено.`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
