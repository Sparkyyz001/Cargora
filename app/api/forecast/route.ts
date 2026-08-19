import { NextResponse } from "next/server"

import { forecastDirections, modelMetrics } from "@/lib/forecast"
import { fetchWeather } from "@/lib/weather"

// GET /api/forecast — прогноз спроса на перевозки по направлениям области
// на 48 часов вперёд.
//
// Пайплайн: реальный прогноз погоды для района Актау (Open-Meteo, без ключа)
// → собственная ML-модель (GradientBoosting, обучена в ml/train.py)
// → почасовое число заявок по направлениям + расчёт дефицита машин.
// При недоступности Open-Meteo используется климатологический фолбэк.

export const revalidate = 600 // кэш 10 минут — как у виджета загруженности

const HORIZON_HOURS = 48

export async function GET() {
  const weather = await fetchWeather(HORIZON_HOURS)
  const directions = forecastDirections(weather.hours)

  // Направления с дефицитом машин — то, ради чего прогноз и нужен
  const deficits = directions
    .filter((d) => d.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit)
    .map((d) => ({
      id: d.id,
      name: d.name,
      ordersNext24h: d.ordersNext24h,
      vehiclesDeclared: d.vehiclesDeclared,
      deficit: d.deficit,
    }))

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    horizon_hours: HORIZON_HOURS,
    weather_source: weather.source,
    model: {
      type: "GradientBoostingRegressor (scikit-learn), собственное обучение",
      target: "число заявок на перевозку в час по направлению",
      metrics: modelMetrics,
    },
    deficits,
    directions,
  })
}
