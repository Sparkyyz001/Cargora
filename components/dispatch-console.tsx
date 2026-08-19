"use client"

import * as React from "react"
import { IconArrowNarrowRight, IconMap2, IconTable } from "@tabler/icons-react"

import { createClient } from "@/lib/supabase/client"
import { updateOrderStatus, type Order } from "@/lib/actions/orders"
import { BODY_TYPE_LABELS, formatKzt, type BodyType } from "@/lib/economics"
import type { BackhaulSuggestion, MatchResult } from "@/lib/matching"
import { cn } from "@/lib/utils"
import { roadBetween } from "@/lib/route-geometry"
import { FleetMap } from "@/components/fleet-map"
import { SimControls, useSimulation } from "@/components/sim-controls"
import { buildSimTrips, type TripMeta } from "@/lib/sim-trips"
import { BackhaulCard } from "@/components/backhaul-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

// Консоль диспетчера: карта области на весь экран и панель заявки справа.
//
// Весь ключевой сценарий укладывается в один экран без переходов:
// заявка прилетает в список → перевозчик открывает → видит маршрут на карте
// и карточку обратной загрузки с экономией → берёт связку одним действием.

const PENDING = ["Ожидает отправки", "Жіберілуді күтуде"]

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff} сек назад`
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
}

/** Короткий звуковой сигнал на новую заявку — диспетчер не смотрит в экран постоянно. */
function playAlert() {
  try {
    const ctx = new AudioContext()
    const play = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g)
      g.connect(ctx.destination)
      osc.frequency.value = freq
      g.gain.setValueAtTime(0.25, ctx.currentTime + start)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur)
    }
    play(660, 0, 0.14)
    play(880, 0.18, 0.14)
    play(1100, 0.36, 0.22)
  } catch {}
}

export function DispatchConsole({
  initialOrders,
  settlements,
  distances,
}: {
  initialOrders: Order[]
  settlements: { id: number; name: string }[]
  distances: { from_id: number; to_id: number; km: number; minutes: number }[]
}) {
  const supabase = React.useMemo(() => createClient(), [])
  const names = React.useMemo(
    () => new Map(settlements.map((s) => [s.id, s.name])),
    [settlements],
  )

  const [orders, setOrders] = React.useState<Order[]>(initialOrders)
  const [selectedId, setSelectedId] = React.useState<number | null>(null)
  const [view, setView] = React.useState<"map" | "table">("map")
  const [match, setMatch] = React.useState<MatchResult | null>(null)
  const [matchLoading, setMatchLoading] = React.useState(false)
  const [taking, setTaking] = React.useState(false)
  const [flash, setFlash] = React.useState(false)
  const [tab, setTab] = React.useState<"orders" | "trips">("orders")
  const [soloTripId, setSoloTripId] = React.useState<number | null>(null)

  const sim = useSimulation()

  // Расписание суток строится один раз из реальных плеч и времени в пути
  const trips: TripMeta[] = React.useMemo(() => {
    const map = new Map(
      distances.map((d) => [`${d.from_id}-${d.to_id}`, { km: Number(d.km), minutes: d.minutes }]),
    )
    return buildSimTrips(map, 34)
  }, [distances])

  const soloTrip = trips.find((t) => t.id === soloTripId) ?? null


  const simStats = React.useMemo(() => {
    let active = 0
    let done = 0
    for (const t of trips) {
      const p = (sim.hour - t.departHour) / t.durationHours
      if (p >= 0 && p <= 1) active++
      else if (p > 1) done++
    }
    return { total: trips.length, active, done }
  }, [trips, sim.hour])

  const selected = orders.find((o) => o.id === selectedId) ?? null

  // Под открытую заявку добавляем рейс на лету: иначе на карте есть маршрут,
  // но нет машины, и нажатие play ничего не двигает
  const ORDER_TRIP_ID = -1
  const tripsWithOrder: TripMeta[] = React.useMemo(() => {
    if (!selected || selected.from_settlement_id == null || selected.to_settlement_id == null) {
      return trips
    }
    const leg = distances.find(
      (d) => d.from_id === selected.from_settlement_id && d.to_id === selected.to_settlement_id,
    )
    if (!leg) return trips

    return [
      ...trips,
      {
        id: ORDER_TRIP_ID,
        label: `${names.get(selected.from_settlement_id) ?? ""} → ${names.get(selected.to_settlement_id) ?? ""}`,
        fromId: selected.from_settlement_id,
        toId: selected.to_settlement_id,
        // Выезд — с текущего момента симуляции, чтобы машина тронулась по play
        departHour: sim.hour,
        durationHours: Math.max(0.4, (leg.minutes / 60) * 1.3),
        cargo: selected.cargo_type,
        driver: selected.driver ?? "—",
        fromName: names.get(selected.from_settlement_id) ?? "",
        toName: names.get(selected.to_settlement_id) ?? "",
        km: Number(leg.km),
      },
    ]
    // sim.hour намеренно не в зависимостях: иначе рейс пересоздавался бы
    // каждый тик и машина стояла бы на месте
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, trips, distances, names])

  // Маршрут выбранной заявки по реальной дороге — из предрассчитанной
  // геометрии OSM, без обращения к сети
  const focusRoute = React.useMemo(
    () => (selected ? roadBetween(selected.from_settlement_id, selected.to_settlement_id) : null),
    [selected],
  )

  // Маршрут обратной загрузки — вторым цветом, чтобы на демо было видно,
  // как связка схлопывает порожний пробег
  const backhaulRoute = React.useMemo(() => {
    const b = match?.backhaul
    if (!b) return null
    const from = orders.find((o) => o.id === b.orderId)
    return from ? roadBetween(from.from_settlement_id, from.to_settlement_id) : null
  }, [match, orders])

  // ── Живая лента заявок: realtime-канал плюс опрос как страховка ──
  React.useEffect(() => {
    const known = new Set(orders.map((o) => o.id))
    let first = true

    const pull = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .in("status", PENDING)
        .order("created_at", { ascending: false })
        .limit(40)
      if (!data) return

      const fresh = data as Order[]
      const isNew = fresh.some((o) => !known.has(o.id))
      fresh.forEach((o) => known.add(o.id))
      if (isNew && !first) {
        setFlash(true)
        setTimeout(() => setFlash(false), 900)
        playAlert()
        try { navigator.vibrate?.([140, 70, 140]) } catch {}
      }
      first = false
      setOrders(fresh)
    }

    pull()
    const timer = setInterval(pull, 4000)

    const channel = supabase
      .channel("dispatch-console")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => pull())
      .subscribe()

    return () => {
      clearInterval(timer)
      channel.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  function selectTrip(id: number) {
    setSoloTripId((cur) => (cur === id ? null : id))
    setSelectedId(null)
    setMatch(null)
  }

  // ── Открытие заявки сразу запускает подбор ──
  async function openOrder(order: Order) {
    setSoloTripId(null)
    if (selectedId === order.id) {
      setSelectedId(null)
      setMatch(null)
      return
    }
    setSelectedId(order.id)
    setMatch(null)

    if (order.from_settlement_id == null || order.to_settlement_id == null) return

    setMatchLoading(true)
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromSettlementId: order.from_settlement_id,
          toSettlementId: order.to_settlement_id,
          weightKg: order.weight ?? 1000,
          bodyType: (order.body_type ?? "tent") as BodyType,
          pickupFrom: order.pickup_from ?? new Date().toISOString(),
          pickupTo: order.pickup_to ?? new Date(Date.now() + 86_400_000).toISOString(),
          excludeOrderId: order.id,
        }),
      })
      const data = await res.json()
      if (data.ok) setMatch(data as MatchResult)
    } catch {
      setMatch(null)
    } finally {
      setMatchLoading(false)
    }
  }

  async function takeBoth(order: Order, suggestion: BackhaulSuggestion) {
    setTaking(true)
    try {
      await Promise.all([
        updateOrderStatus(order.id, "В пути"),
        updateOrderStatus(suggestion.orderId, "В пути"),
      ])
      setOrders((prev) => prev.filter((o) => o.id !== order.id && o.id !== suggestion.orderId))
      setSelectedId(null)
      setMatch(null)
    } finally {
      setTaking(false)
    }
  }

  async function takeSingle(order: Order) {
    setTaking(true)
    try {
      await updateOrderStatus(order.id, "В пути")
      setOrders((prev) => prev.filter((o) => o.id !== order.id))
      setSelectedId(null)
      setMatch(null)
    } finally {
      setTaking(false)
    }
  }

  return (
    <div className="relative flex h-[calc(100svh-var(--header-height))] overflow-hidden">
      {/* Вспышка на новую заявку */}
      <div
        className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-500"
        style={{
          background: "radial-gradient(circle at 30% 50%, rgb(59 130 246 / 0.18) 0%, transparent 65%)",
          opacity: flash ? 1 : 0,
        }}
      />

      {/* ── Карта ── */}
      <div className="relative min-w-0 flex-1">
        <div className={cn("h-full", view === "map" ? "block" : "hidden")}>
          <FleetMap
            trips={tripsWithOrder}
            simHour={sim.hour}
            focusRoute={focusRoute ?? (soloTrip ? roadBetween(soloTrip.fromId, soloTrip.toId) : null)}
            backhaulRoute={backhaulRoute}
            soloTripId={selected ? ORDER_TRIP_ID : soloTripId}
          />
        </div>

        {view === "table" && (
          <div className="h-full overflow-y-auto p-4">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="p-2 text-left font-medium">Заявка</th>
                  <th className="p-2 text-left font-medium">Груз</th>
                  <th className="p-2 text-left font-medium">Маршрут</th>
                  <th className="p-2 text-right font-medium">Вес</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => openOrder(o)}
                    className={cn(
                      "cursor-pointer border-b transition-colors hover:bg-muted/50",
                      selectedId === o.id && "bg-muted",
                    )}
                  >
                    <td className="p-2 font-mono text-xs">{o.order_number}</td>
                    <td className="p-2">{o.cargo_type}</td>
                    <td className="p-2 text-muted-foreground">
                      {names.get(o.from_settlement_id ?? -1) ?? "—"} →{" "}
                      {names.get(o.to_settlement_id ?? -1) ?? "—"}
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {o.weight ? `${(o.weight / 1000).toFixed(1)} т` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Плеер симуляции суток */}
        {view === "map" && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
            <SimControls
              hour={sim.hour}
              playing={sim.playing}
              speed={sim.speed}
              onPlayPause={() => sim.setPlaying(!sim.playing)}
              onReset={sim.reset}
              onSpeed={sim.setSpeed}
              onScrub={(h) => { sim.setPlaying(false); sim.setHour(h) }}
              stats={simStats}
            />
          </div>
        )}

        {/* Переключатель карта / таблица поверх карты */}
        <div className="absolute left-4 top-4 z-20 flex gap-1 rounded-lg border bg-background/95 p-1 shadow-sm backdrop-blur">
          <button
            onClick={() => setView("map")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <IconMap2 className="size-3.5" />
            Карта
          </button>
          <button
            onClick={() => setView("table")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <IconTable className="size-3.5" />
            Таблица
            <span className="rounded bg-black/15 px-1 tabular-nums dark:bg-white/15">{orders.length}</span>
          </button>
        </div>
      </div>

      {/* ── Панель справа ── */}
      <div className="flex w-[400px] shrink-0 flex-col border-l bg-background">
        <div className="shrink-0 border-b p-2">
          <div className="flex gap-1 rounded-lg bg-muted/60 p-1">
            <button
              onClick={() => setTab("orders")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === "orders" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Заявки
              <span className="rounded bg-primary/15 px-1.5 tabular-nums text-primary">{orders.length}</span>
            </button>
            <button
              onClick={() => setTab("trips")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === "trips" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Рейсы
              <span className="rounded bg-amber-500/15 px-1.5 tabular-nums text-amber-600 dark:text-amber-400">
                {simStats.active}
              </span>
            </button>
          </div>
        </div>

        {tab === "trips" ? (
          <div className="flex-1 overflow-y-auto">
            <div className="border-b px-4 py-2.5">
              <p className="text-xs text-muted-foreground">
                {soloTrip
                  ? "На карте показан только выбранный рейс"
                  : "Нажмите на рейс — на карте останется только он"}
              </p>
            </div>
            <div className="divide-y">
              {trips.map((t) => {
                const p = (sim.hour - t.departHour) / t.durationHours
                const state = p < 0 ? "ждёт" : p > 1 ? "доставлен" : "в пути"
                return (
                  <button
                    key={t.id}
                    onClick={() => selectTrip(t.id)}
                    className={cn(
                      "w-full px-4 py-2.5 text-left transition-colors hover:bg-muted/50",
                      soloTripId === t.id && "bg-muted",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{t.label}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          state === "в пути" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                          state === "доставлен" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                          state === "ждёт" && "bg-muted text-muted-foreground",
                        )}
                      >
                        {state}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{t.cargo}</span>
                      <span className="ml-auto shrink-0 tabular-nums">
                        {Math.round(t.km)} км · выезд {String(Math.floor(t.departHour)).padStart(2, "0")}:
                        {String(Math.round((t.departHour % 1) * 60)).padStart(2, "0")}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : selected ? (
          <div className="flex-1 overflow-y-auto">
            {/* Шапка заявки */}
            <div className="border-b p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold">{selected.order_number}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {timeAgo(selected.created_at)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                  Закрыть
                </Button>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="font-medium">
                  {names.get(selected.from_settlement_id ?? -1) ?? "—"}
                </span>
                <IconArrowNarrowRight className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">
                  {names.get(selected.to_settlement_id ?? -1) ?? "—"}
                </span>
                {selected.distance_km ? (
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {Math.round(Number(selected.distance_km))} км
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
                  <div className="text-muted-foreground">Груз</div>
                  <div className="mt-0.5 font-medium">{selected.cargo_type}</div>
                </div>
                <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
                  <div className="text-muted-foreground">Кузов</div>
                  <div className="mt-0.5 font-medium">
                    {BODY_TYPE_LABELS[(selected.body_type ?? "tent") as BodyType]}
                  </div>
                </div>
                <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
                  <div className="text-muted-foreground">Вес</div>
                  <div className="mt-0.5 font-medium tabular-nums">
                    {selected.weight ? `${(selected.weight / 1000).toFixed(1)} т` : "—"}
                  </div>
                </div>
                <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
                  <div className="text-muted-foreground">Объём</div>
                  <div className="mt-0.5 font-medium tabular-nums">
                    {selected.volume ? `${selected.volume} м³` : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Подбор */}
            <div className="flex flex-col gap-3 p-4">
              {matchLoading && (
                <p className="text-sm text-muted-foreground">Подбираем машину и обратный груз…</p>
              )}

              {!matchLoading && match?.backhaul && (
                <BackhaulCard
                  suggestion={match.backhaul}
                  alternatives={match.alternativeBackhauls}
                  bodyType={(selected.body_type ?? "tent") as BodyType}
                  taking={taking}
                  onTakeBoth={(s) => takeBoth(selected, s)}
                />
              )}

              {!matchLoading && match && !match.backhaul && (
                <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  Встречного груза под это плечо сейчас нет — обратный рейс будет порожним.
                </div>
              )}

              {!matchLoading && match && match.carriers.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Свободные машины
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {match.carriers.slice(0, 4).map((c) => (
                        <div
                          key={c.vehicleId}
                          className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{c.plate}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.carrierName} · подача {Math.round(c.deadheadToPickupKm)} км
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">
                            {formatKzt(c.suggestedPriceKzt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Button
                variant="outline"
                className="w-full"
                disabled={taking}
                onClick={() => takeSingle(selected)}
              >
                Взять только этот рейс
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {orders.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium">Нет входящих заявок</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Новая заявка появится здесь автоматически
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {orders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => openOrder(o)}
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold">{o.order_number}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(o.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm">{o.cargo_type}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate">
                        {names.get(o.from_settlement_id ?? -1) ?? "—"}
                      </span>
                      <IconArrowNarrowRight className="size-3 shrink-0" />
                      <span className="truncate">
                        {names.get(o.to_settlement_id ?? -1) ?? "—"}
                      </span>
                      {o.weight ? (
                        <span className="ml-auto shrink-0 tabular-nums">
                          {(o.weight / 1000).toFixed(1)} т
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
