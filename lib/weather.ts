// Почасовой прогноз погоды для района порта Актау — вход ML-модели прогноза
// загруженности. Источник: Open-Meteo (бесплатно, без API-ключа). При
// недоступности — климатологический фолбэк по Мангистау, чтобы прогноз
// продолжал работать офлайн.

import type { HourlyWeather } from "./forecast"

const LAT = 43.65
const LON = 51.16

export type WeatherForecast = { hours: HourlyWeather[]; source: "open-meteo" | "climatology" }

export async function fetchWeather(horizonHours = 48): Promise<WeatherForecast> {
  const now = new Date()
  now.setUTCMinutes(0, 0, 0)

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&hourly=wind_speed_10m,temperature_2m&windspeed_unit=ms&timezone=UTC&forecast_days=3`
    const res = await fetch(url, { next: { revalidate: 600 } })
    if (!res.ok) throw new Error(`open-meteo ${res.status}`)
    const data = await res.json()

    const times: string[] = data.hourly.time
    const wind: number[] = data.hourly.wind_speed_10m
    const temp: number[] = data.hourly.temperature_2m

    const hours: HourlyWeather[] = []
    for (let i = 0; i < times.length && hours.length < horizonHours; i++) {
      const ts = new Date(`${times[i]}:00Z`)
      if (ts >= now) hours.push({ ts, windMs: wind[i], tempC: temp[i] })
    }
    if (hours.length < horizonHours) throw new Error("неполный прогноз")
    return { hours, source: "open-meteo" }
  } catch {
    const hours: HourlyWeather[] = Array.from({ length: horizonHours }, (_, i) => {
      const ts = new Date(now.getTime() + i * 3600000)
      const doy = Math.floor((ts.getTime() - Date.UTC(ts.getUTCFullYear(), 0, 0)) / 86400000)
      const hod = (ts.getUTCHours() + 5) % 24
      return {
        ts,
        windMs: 7 + 2.5 * Math.cos((2 * Math.PI * (doy - 20)) / 365.25),
        tempC:
          13 +
          16 * Math.cos((2 * Math.PI * (doy - 200)) / 365.25) +
          5 * Math.cos((2 * Math.PI * (hod - 15)) / 24),
      }
    })
    return { hours, source: "climatology" }
  }
}
