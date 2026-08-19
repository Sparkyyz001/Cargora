// Сверка с ml/parity_check.py: одинаковые входы — одинаковые предсказания.
// Запуск: node ml/parity-check.ts
// Времена в кейсах — по Актау (UTC+5), поэтому из ISO-времени вычитаем 5 часов.

import { predictDemand } from "../lib/forecast.ts"

const CASES: [string, string, number, number][] = [
  ["2026-06-12T09:00:00", "aktau-zhanaozen", 7.0, 24.0],
  ["2026-06-12T03:00:00", "zhanaozen-aktau", 12.5, 18.0],
  ["2026-12-16T10:00:00", "aktau-shetpe", 6.0, -14.0],
  ["2026-01-25T15:00:00", "aktau-beineu", 19.0, -2.0],
  ["2026-06-14T11:00:00", "aktau-zhetybai", 5.0, 42.0],
]

for (const [ts, dir, wind, temp] of CASES) {
  const utc = new Date(new Date(`${ts}Z`).getTime() - 5 * 3600000)
  console.log(`${ts} ${dir.padStart(22)}: ${predictDemand(utc, dir, wind, temp).toFixed(4)}`)
}
