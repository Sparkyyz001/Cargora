"use client"

import * as React from "react"
import {
  IconClock,
  IconDroplet,
  IconGauge,
  IconPhone,
  IconRoad,
  IconTruckReturn,
} from "@tabler/icons-react"

import {
  BODY_TYPE_LABELS,
  DIESEL_PRICE_KZT,
  DRIVER_HOURLY_KZT,
  FUEL_CONSUMPTION,
  formatKzt,
  marketRatePerKm,
} from "@/lib/economics"
import { findDriver, fullName, driverInitials } from "@/lib/drivers"
import type { TripMeta } from "@/lib/sim-trips"
import { formatSimClock } from "@/components/sim-controls"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// Статистика по одному рейсу: где машина сейчас, сколько прошла, сколько
// сожгла и что рейс приносит. Считается от симулированного времени, поэтому
// цифры двигаются вместе с машиной на карте.

export function TripDetailPanel({
  trip,
  simHour,
  onClose,
}: {
  trip: TripMeta
  simHour: number
  onClose: () => void
}) {
  const rawProgress = (simHour - trip.departHour) / trip.durationHours
  const progress = Math.min(1, Math.max(0, rawProgress))

  const state = rawProgress < 0 ? "ждёт выезда" : rawProgress > 1 ? "доставлен" : "в пути"

  const driver = findDriver(trip.driver)

  // ── Пройдено и осталось ──
  const kmDone = trip.km * progress
  const kmLeft = trip.km - kmDone
  const hoursLeft = trip.durationHours * (1 - progress)
  const arrivalHour = trip.departHour + trip.durationHours

  // ── Экономика рейса ──
  const perKm = FUEL_CONSUMPTION[trip.bodyType] / 100
  const fuelTotal = trip.km * perKm
  const fuelDone = kmDone * perKm
  const fuelKzt = Math.round(fuelTotal * DIESEL_PRICE_KZT)

  const driverKzt = Math.round(trip.durationHours * DRIVER_HOURLY_KZT)
  const rate = marketRatePerKm(trip.capacityKg)
  const price = Math.round((trip.km * rate) / 100) * 100
  const commission = Math.round(price * 0.02)
  const margin = price - fuelKzt - driverKzt - commission

  // ── Цена порожнего возврата ──
  const emptyReturnKzt = Math.round(trip.returnKm * perKm * DIESEL_PRICE_KZT)

  const loadPct = Math.round((trip.weightKg / trip.capacityKg) * 100)

  return (
    <div className="flex flex-col">
      {/* Шапка */}
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{trip.label}</p>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-[10px]",
                state === "в пути" && "border-amber-500/40 text-amber-600 dark:text-amber-400",
                state === "доставлен" && "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
              )}
            >
              {state}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {trip.cargo} · {trip.plate}
          </p>
        </div>
        <button onClick={onClose} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
          Закрыть
        </button>
      </div>

      {/* Прогресс */}
      <div className="border-b p-4">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-medium tabular-nums">{formatSimClock(trip.departHour)}</span>
          <span className="tabular-nums text-muted-foreground">
            {Math.round(progress * 100)}% пути
          </span>
          <span className="font-medium tabular-nums">{formatSimClock(arrivalHour)}</span>
        </div>

        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              state === "доставлен" ? "bg-emerald-500" : "bg-amber-500",
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">пройдено {Math.round(kmDone)} км</span>
          <span className="tabular-nums">
            {state === "доставлен"
              ? "прибыл"
              : `осталось ${Math.round(kmLeft)} км · ${hoursLeft.toFixed(1)} ч`}
          </span>
        </div>
      </div>

      {/* Показатели */}
      <div className="grid grid-cols-2 gap-2 border-b p-4">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconRoad className="size-3.5" />
            Плечо
          </div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums">{Math.round(trip.km)} км</div>
        </div>

        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconClock className="size-3.5" />
            В пути
          </div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums">
            {Math.floor(trip.durationHours)} ч {Math.round((trip.durationHours % 1) * 60)} мин
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconDroplet className="size-3.5" />
            Топливо
          </div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums">
            {fuelDone.toFixed(1)}
            <span className="text-xs font-normal text-muted-foreground"> / {fuelTotal.toFixed(1)} л</span>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconGauge className="size-3.5" />
            Загрузка
          </div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums">
            {(trip.weightKg / 1000).toFixed(1)} т
            <span className="text-xs font-normal text-muted-foreground"> · {loadPct}%</span>
          </div>
        </div>
      </div>

      {/* Водитель */}
      {driver && (
        <div className="border-b p-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Водитель
          </h3>
          <div className="flex items-start gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-500/15 text-xs font-semibold text-amber-600 dark:text-amber-400">
              {driverInitials(driver)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{fullName(driver)}</div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <IconPhone className="size-3" />
                {driver.phone}
              </div>
              <div className="text-xs text-muted-foreground">
                стаж {driver.experienceYears} лет · категории {driver.license}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Экономика */}
      <div className="p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Экономика рейса
        </h3>

        <div className="space-y-1.5 text-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">
              Ставка<span className="ml-1 text-xs">({rate} ₸/км)</span>
            </span>
            <span className="font-semibold tabular-nums">{formatKzt(price)}</span>
          </div>

          <Separator className="my-2" />

          <div className="flex items-baseline justify-between text-muted-foreground">
            <span>
              Топливо
              <span className="ml-1 text-xs">
                ({BODY_TYPE_LABELS[trip.bodyType]}, {FUEL_CONSUMPTION[trip.bodyType]} л/100 км)
              </span>
            </span>
            <span className="tabular-nums">−{formatKzt(fuelKzt)}</span>
          </div>

          <div className="flex items-baseline justify-between text-muted-foreground">
            <span>Водитель</span>
            <span className="tabular-nums">−{formatKzt(driverKzt)}</span>
          </div>

          <div className="flex items-baseline justify-between text-muted-foreground">
            <span>Комиссия платформы</span>
            <span className="tabular-nums">−{formatKzt(commission)}</span>
          </div>

          <Separator className="my-2" />

          <div className="flex items-baseline justify-between">
            <span className="font-medium">Остаётся перевозчику</span>
            <span
              className={cn(
                "text-base font-semibold tabular-nums",
                margin > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
              )}
            >
              {formatKzt(margin)}
            </span>
          </div>
        </div>

        {/* Цена порожнего возврата — главный аргумент за связку */}
        <div className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/[0.05] p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
            <IconTruckReturn className="size-3.5" />
            Если возвращаться порожним
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
            −{formatKzt(emptyReturnKzt)}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {Math.round(trip.returnKm)} км пустого хода — это {Math.round((emptyReturnKzt / Math.max(1, margin)) * 100)}% от того,
            что рейс приносит. Обратная загрузка убирает эти расходы.
          </p>
        </div>
      </div>
    </div>
  )
}
