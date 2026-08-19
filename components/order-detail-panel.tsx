"use client"

import * as React from "react"
import {
  IconArrowNarrowRight,
  IconCircleCheck,
  IconCircleDot,
  IconPhone,
  IconUser,
} from "@tabler/icons-react"

import type { Order } from "@/lib/actions/orders"
import {
  BODY_TYPE_LABELS,
  DIESEL_PRICE_KZT,
  DRIVER_HOURLY_KZT,
  FUEL_CONSUMPTION,
  TRUCK_TIME_FACTOR,
  formatKzt,
  marketRatePerKm,
  type BodyType,
} from "@/lib/economics"
import { findDriver, fullName, driverInitials } from "@/lib/drivers"
import type { CarrierMatch } from "@/lib/matching"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// Панель заявки: лента активности, стороны сделки и разбивка стоимости.
//
// Разбивка тут не для красоты — требование кейса про экономическое
// обоснование закрывается именно ей: видно, из чего складывается цена
// рейса и сколько из неё съедает топливо и время водителя.

const COMMISSION_RATE = 0.02

type Stage = { key: string; label: string; note: string; done: boolean; current: boolean }

function buildStages(order: Order): Stage[] {
  const status = order.status
  const inTransit = status === "В пути"
  const delivered = status === "Доставлен"

  return [
    {
      key: "created",
      label: "Заявка размещена",
      note: "Появилась на бирже, перевозчики видят её",
      done: true,
      current: !inTransit && !delivered,
    },
    {
      key: "matched",
      label: "Перевозчик найден",
      note: "Машина подобрана по кузову и грузоподъёмности",
      done: inTransit || delivered,
      current: false,
    },
    {
      key: "transit",
      label: "В пути",
      note: "Груз едет, положение видно на карте",
      done: inTransit || delivered,
      current: inTransit,
    },
    {
      key: "delivered",
      label: "Доставлено",
      note: "Выгружено, акт приёмки подтверждён",
      done: delivered,
      current: delivered,
    },
  ]
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return "—"
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Aqtau",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

function Party({
  role,
  name,
  phone,
  address,
  accent,
}: {
  role: string
  name: string | null
  phone: string | null
  address: string | null
  accent: string
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
      <div className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold", accent)}>
        <IconUser className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{role}</div>
        <div className="truncate text-sm font-medium">{name ?? "—"}</div>
        {phone && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <IconPhone className="size-3" />
            {phone}
          </div>
        )}
        {address && <div className="truncate text-xs text-muted-foreground">{address}</div>}
      </div>
    </div>
  )
}

export function OrderDetailPanel({
  order,
  fromName,
  toName,
  distanceKm,
  minutes,
  carrier,
}: {
  order: Order
  fromName: string
  toName: string
  distanceKm: number
  minutes: number
  carrier: CarrierMatch | null
}) {
  const stages = buildStages(order)
  const bodyType = (order.body_type ?? "tent") as BodyType

  // Водитель: из подобранной машины, иначе из самой заявки
  const driver = findDriver(carrier?.carrierName ?? order.driver)

  // ── Разбивка стоимости рейса ──
  const capacity = carrier?.capacityKg ?? Number(order.weight ?? 0) ?? 0
  const ratePerKm = marketRatePerKm(capacity)
  const price = carrier?.suggestedPriceKzt ?? Math.round((distanceKm * ratePerKm) / 100) * 100

  const fuelLiters = (distanceKm * FUEL_CONSUMPTION[bodyType]) / 100
  const fuelKzt = Math.round(fuelLiters * DIESEL_PRICE_KZT)
  const hours = (minutes / 60) * TRUCK_TIME_FACTOR
  const driverKzt = Math.round(hours * DRIVER_HOURLY_KZT)
  const commission = Math.round(price * COMMISSION_RATE)
  const margin = price - fuelKzt - driverKzt - commission

  return (
    <div className="flex flex-col">
      {/* ── Активность ── */}
      <div className="border-b p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Активность
        </h3>

        <div className="flex flex-col gap-0">
          {stages.map((st, i) => (
            <div key={st.key} className="flex gap-3">
              {/* Полоса времени */}
              <div className="flex flex-col items-center">
                {st.done ? (
                  <IconCircleCheck
                    className={cn(
                      "size-4 shrink-0",
                      st.current
                        ? "text-blue-500"
                        : "text-emerald-600 dark:text-emerald-400",
                    )}
                  />
                ) : (
                  <IconCircleDot className="size-4 shrink-0 text-muted-foreground/40" />
                )}
                {i < stages.length - 1 && (
                  <div
                    className={cn(
                      "w-px flex-1",
                      stages[i + 1].done ? "bg-emerald-500/40" : "bg-border",
                    )}
                  />
                )}
              </div>

              <div className={cn("pb-3", !st.done && "opacity-45")}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{st.label}</span>
                  {st.current && (
                    <Badge variant="outline" className="border-blue-500/40 text-[10px] text-blue-600 dark:text-blue-400">
                      сейчас
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{st.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Стороны ── */}
      <div className="flex flex-col gap-2 border-b p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Участники
        </h3>

        <Party
          role="Отправитель"
          name={order.sender_name}
          phone={order.sender_phone}
          address={order.sender_address}
          accent="bg-blue-500/15 text-blue-600 dark:text-blue-400"
        />
        <Party
          role="Получатель"
          name={order.recipient_name}
          phone={order.recipient_phone}
          address={order.recipient_address}
          accent="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        />

        {/* Водитель */}
        <div className="flex items-start gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-500/15 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            {driver ? driverInitials(driver) : <IconUser className="size-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Водитель</div>
            {driver ? (
              <>
                <div className="truncate text-sm font-medium">{fullName(driver)}</div>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <IconPhone className="size-3" />
                  {driver.phone}
                </div>
                <div className="text-xs text-muted-foreground">
                  стаж {driver.experienceYears} лет · категории {driver.license}
                  {carrier ? ` · ${carrier.plate}` : ""}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Не назначен</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Детали ── */}
      <div className="border-b p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Детали
        </h3>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Номер заявки</dt>
            <dd className="font-mono text-xs font-medium">{order.order_number}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Статус</dt>
            <dd className="font-medium">{order.status}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Маршрут</dt>
            <dd className="flex items-center gap-1 font-medium">
              <span className="truncate">{fromName}</span>
              <IconArrowNarrowRight className="size-3 shrink-0" />
              <span className="truncate">{toName}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Плечо</dt>
            <dd className="font-medium tabular-nums">{Math.round(distanceKm)} км</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Груз</dt>
            <dd className="font-medium">{order.cargo_type}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Кузов</dt>
            <dd className="font-medium">{BODY_TYPE_LABELS[bodyType]}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Вес</dt>
            <dd className="font-medium tabular-nums">
              {order.weight ? `${(Number(order.weight) / 1000).toFixed(1)} т` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Объём</dt>
            <dd className="font-medium tabular-nums">
              {order.volume ? `${order.volume} м³` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Забрать с</dt>
            <dd className="font-medium">{fmtDateTime(order.pickup_from)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Забрать до</dt>
            <dd className="font-medium">{fmtDateTime(order.pickup_to)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Время в пути</dt>
            <dd className="font-medium tabular-nums">
              {Math.floor(hours)} ч {Math.round((hours % 1) * 60)} мин
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Создана</dt>
            <dd className="font-medium">{fmtDateTime(order.created_at)}</dd>
          </div>
        </dl>
      </div>

      {/* ── Экономика рейса ── */}
      <div className="p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Экономика рейса
        </h3>

        <div className="space-y-1.5 text-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">
              Ставка перевозки
              <span className="ml-1 text-xs">({ratePerKm} ₸/км)</span>
            </span>
            <span className="font-semibold tabular-nums">{formatKzt(price)}</span>
          </div>

          <Separator className="my-2" />

          <div className="flex items-baseline justify-between text-muted-foreground">
            <span>
              Топливо
              <span className="ml-1 text-xs">
                ({fuelLiters.toFixed(1)} л × {DIESEL_PRICE_KZT} ₸)
              </span>
            </span>
            <span className="tabular-nums">−{formatKzt(fuelKzt)}</span>
          </div>

          <div className="flex items-baseline justify-between text-muted-foreground">
            <span>
              Водитель
              <span className="ml-1 text-xs">
                ({hours.toFixed(1)} ч × {DRIVER_HOURLY_KZT} ₸)
              </span>
            </span>
            <span className="tabular-nums">−{formatKzt(driverKzt)}</span>
          </div>

          <div className="flex items-baseline justify-between text-muted-foreground">
            <span>
              Комиссия платформы
              <span className="ml-1 text-xs">(2%)</span>
            </span>
            <span className="tabular-nums">−{formatKzt(commission)}</span>
          </div>

          <Separator className="my-2" />

          <div className="flex items-baseline justify-between">
            <span className="font-medium">Остаётся перевозчику</span>
            <span
              className={cn(
                "text-base font-semibold tabular-nums",
                margin > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
              )}
            >
              {formatKzt(margin)}
            </span>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Ставка — биржа DELLA, {DIESEL_PRICE_KZT} ₸/л дизеля по мониторингу АЗС, час водителя
          {" "}{DRIVER_HOURLY_KZT} ₸ из средней зарплаты по области (БНС, I кв. 2026). Время
          гружёного грузовика — расчёт OSRM × {TRUCK_TIME_FACTOR}.
        </p>
      </div>
    </div>
  )
}
