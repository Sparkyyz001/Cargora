"use client"

import * as React from "react"

import {
  BASELINE_EMPTY_RUN_SHARE,
  DIESEL_PRICE_KZT,
  FUEL_CONSUMPTION,
  MATCHING_REDUCTION,
  REGION_TRUCK_COUNT,
  formatKzt,
} from "@/lib/economics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Калькулятор масштаба для акимата: что даст платформа области, если ею
// начнёт пользоваться N% перевозчиков. Все коэффициенты — из lib/economics,
// источники подписаны прямо под калькулятором, чтобы вопрос «откуда цифры»
// закрывался до того, как его зададут.

/** Расход тента 20 т — самый массовый кузов в области. */
const CONSUMPTION_PER_KM = FUEL_CONSUMPTION.tent / 100

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-sm text-muted-foreground">{label}</label>
        <span className="text-sm font-semibold tabular-nums">
          {value.toLocaleString("ru-RU")} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
      />
    </div>
  )
}

export function ScaleCalculator() {
  const [sharePct, setSharePct] = React.useState(10)
  const [legKm, setLegKm] = React.useState(120)
  const [tripsPerDay, setTripsPerDay] = React.useState(1.5)

  const activeTrucks = REGION_TRUCK_COUNT * (sharePct / 100)
  const emptyKmSavedPerDay =
    activeTrucks * tripsPerDay * BASELINE_EMPTY_RUN_SHARE * MATCHING_REDUCTION * legKm
  const kztSavedPerDay = emptyKmSavedPerDay * CONSUMPTION_PER_KM * DIESEL_PRICE_KZT
  const litersSavedPerDay = emptyKmSavedPerDay * CONSUMPTION_PER_KM

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Что это даст области</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-5 md:grid-cols-3">
          <Slider
            label="Доля активных перевозчиков"
            value={sharePct}
            min={1}
            max={30}
            step={1}
            unit="%"
            onChange={setSharePct}
          />
          <Slider
            label="Среднее плечо"
            value={legKm}
            min={20}
            max={400}
            step={10}
            unit="км"
            onChange={setLegKm}
          />
          <Slider
            label="Рейсов в день на машину"
            value={tripsPerDay}
            min={0.5}
            max={4}
            step={0.1}
            unit=""
            onChange={setTripsPerDay}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
            <div className="text-xs text-muted-foreground">Машин на платформе</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {Math.round(activeTrucks).toLocaleString("ru-RU")}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              из {REGION_TRUCK_COUNT.toLocaleString("ru-RU")} в области
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="text-xs text-muted-foreground">Порожних км убрано в сутки</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {Math.round(emptyKmSavedPerDay).toLocaleString("ru-RU")}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              это {Math.round(litersSavedPerDay).toLocaleString("ru-RU")} л дизеля
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="text-xs text-muted-foreground">Экономия в сутки</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatKzt(kztSavedPerDay)}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {formatKzt(kztSavedPerDay * 365)} в год
            </div>
          </div>
        </div>

        {/* Источники — закрывают вопрос «откуда цифры» заранее */}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Порожний пробег 25.8% — Eurostat 2024, внутренние перевозки ЕС. Снижение 20% — Convoy
          Automated Reloads −19%, Uber Freight −22.6%. Автопарк 18 795 машин — БНС на 01.03.2026.
          Дизель 340 ₸/л — мониторинг АЗС 19.08.2026. Расход 30 л/100 км — норма для тента 20 т.
          По Казахстану собственных исследований порожнего пробега не существует, поэтому взят
          европейский бенчмарк для внутренних перевозок.
        </p>
      </CardContent>
    </Card>
  )
}
