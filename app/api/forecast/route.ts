import { NextResponse } from "next/server"

import { forecastCheckpoints, modelMetrics } from "@/lib/forecast"
import { fetchWeather } from "@/lib/weather"

// GET /api/forecast — прогноз загруженности пунктов пропуска на 48 часов.
//
// Пайплайн: реальный прогноз погоды для района Актау (Open-Meteo, без ключа)
// → собственная ML-модель (GradientBoosting, обучена в ml/train.py)
// → почасовой прогноз загрузки + рекомендация лучшего окна прохождения.
// При недоступности Open-Meteo используется климатологический фолбэк.

export const revalidate = 600 // кэш 10 минут — как у виджета загруженности

const HORIZON_HOURS = 48

export async function GET() {
  const weather = await fetchWeather(HORIZON_HOURS)
  const points = forecastCheckpoints(weather.hours)

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    horizon_hours: HORIZON_HOURS,
    weather_source: weather.source,
    model: {
      type: "GradientBoostingRegressor (scikit-learn), собственное обучение",
      metrics: modelMetrics,
    },
    points,
  })
}
