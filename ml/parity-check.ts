// Сверка с ml/parity_check.py: одинаковые входы — одинаковые предсказания.
// Запуск: pnpm dlx tsx ml/parity-check.ts
// Времена в кейсах — по Актау (UTC+5), поэтому из ISO-времени вычитаем 5 часов.

import { predictLoad } from "../lib/forecast"

const CASES: [string, string, number, number][] = [
  ["2026-06-12T09:00:00", "aktau-port", 7.0, 24.0],
  ["2026-06-12T03:00:00", "bolashak", 12.5, 18.0],
  ["2026-12-16T10:00:00", "tazhen", 6.0, -14.0],
  ["2026-01-25T15:00:00", "aktau-port", 19.0, -2.0],
  ["2026-06-14T11:00:00", "beineu", 5.0, 28.0],
]

for (const [ts, cp, wind, temp] of CASES) {
  const utc = new Date(new Date(`${ts}Z`).getTime() - 5 * 3600000)
  console.log(`${ts} ${cp.padStart(11)}: ${predictLoad(utc, cp, wind, temp).toFixed(1)}`)
}
