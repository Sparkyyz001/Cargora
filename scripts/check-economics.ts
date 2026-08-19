// Сверка расчёта экономики с эталоном из ТЗ (раздел 3.4).
//
//   node scripts/check-economics.ts
//
// Эталон: порожний возврат Актау → Жанаозен, тент 20 т = 23 712 ₸.
// В ТЗ он посчитан по 149.5 км / 1 ч 53 мин; у нас в матрице лежат
// фактические значения OSRM (150.68 км / 114 мин), поэтому итог
// отличается на доли процента — допуск ±1%.

import { computeTripCost, computeBackhaulSaving, DRIVER_HOURLY_KZT, type DistanceMatrix } from "../lib/economics.ts"

const REFERENCE_KZT = 23_712
const TOLERANCE = 0.01

let failed = 0

function check(label: string, actual: number, expected: number, tolerance: number) {
  const diff = Math.abs(actual - expected) / expected
  const ok = diff <= tolerance
  if (!ok) failed++
  console.log(`  ${ok ? "✓" : "✗"} ${label}: ${actual} (эталон ${expected}, расхождение ${(diff * 100).toFixed(2)}%)`)
}

console.log("Ставка водителя, ₸/час:")
check("DRIVER_HOURLY_KZT", DRIVER_HOURLY_KZT, 3456, 0.001)

console.log("\nПорожний возврат Актау → Жанаозен, тент 20 т (150.68 км, 114 мин):")
const cost = computeTripCost(150.68, 114, "tent", 20_000, false)
console.log(`  топливо ${cost.fuelLiters} л → ${cost.fuelKzt} ₸   (в ТЗ 44.9 л / 15 249 ₸)`)
console.log(`  время   ${cost.hours} ч → ${cost.driverKzt} ₸   (в ТЗ 2.4 ч / 8 463 ₸)`)
check("итого прямых потерь", cost.totalKzt, REFERENCE_KZT, TOLERANCE)

// Матрица-заглушка на нескольких реальных парах из distance_matrix
const M: DistanceMatrix = {
  get(from, to) {
    const pairs: Record<string, [number, number]> = {
      "1-2": [150.68, 114], "2-1": [150.68, 114],
      "2-9": [68.97, 55], "9-2": [68.97, 55],
      "9-1": [86.18, 67], "1-9": [86.18, 67],
    }
    const v = pairs[`${from}-${to}`]
    return v ? { km: v[0], minutes: v[1] } : null
  },
}

console.log("\nСвязка: груз Актау→Жанаозен, обратный груз Жанаозен→Актау (подача 0 км):")
const ideal = computeBackhaulSaving({ fromId: 1, toId: 2 }, { fromId: 2, toId: 1 }, M, "tent", 20_000)
console.log(`  порожний пробег ${ideal.emptyKmWithout} км → ${ideal.emptyKmWith} км`)
console.log(`  экономия ${ideal.kztSaved} ₸, топлива ${ideal.fuelLitersSaved} л, времени ${ideal.hoursSaved} ч`)
check("экономия при нулевой подаче", ideal.kztSaved, REFERENCE_KZT, TOLERANCE)

console.log("\nСвязка с подачей: обратный груз забирается в Мунайшы (68.97 км от Жанаозена):")
const withConnection = computeBackhaulSaving({ fromId: 1, toId: 2 }, { fromId: 9, toId: 1 }, M, "tent", 20_000)
console.log(`  порожний пробег ${withConnection.emptyKmWithout} км → ${withConnection.emptyKmWith} км`)
console.log(`  экономия ${withConnection.kztSaved} ₸`)
if (withConnection.kztSaved >= ideal.kztSaved) {
  console.log("  ✗ подача не должна быть выгоднее нулевой")
  failed++
} else {
  console.log("  ✓ подача уменьшает выгоду, как и должна")
}

console.log(failed === 0 ? "\nВсе проверки пройдены." : `\n${failed} проверок провалено.`)
process.exit(failed === 0 ? 0 : 1)
