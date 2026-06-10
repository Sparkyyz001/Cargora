"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { updateOrderStatus } from "@/lib/actions/orders"
import type { Order } from "@/lib/actions/orders"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

function playAlert() {
  try {
    const ctx = new AudioContext()
    const play = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g)
      g.connect(ctx.destination)
      osc.frequency.value = freq
      g.gain.setValueAtTime(0.3, ctx.currentTime + start)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur)
    }
    play(660, 0, 0.15)
    play(880, 0.2, 0.15)
    play(1100, 0.4, 0.25)
  } catch {}
}

function parseRoute(driver: string | null) {
  if (!driver) return null
  const isLand = driver.startsWith("[LAND] ")
  const clean = isLand ? driver.slice(7) : driver
  const m = clean.match(/^([A-Z]{2,3}-\d{3,4})\s*·\s*(.+?)\s*·\s*(\d{2}:\d{2})/)
  if (!m) return null
  return { id: m[1], route: m[2], time: m[3], isLand }
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff} сек назад`
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
}

export function DispatchView() {
  const supabase = React.useMemo(() => createClient(), [])

  const [orders, setOrders] = React.useState<Order[]>([])
  const [dismissed, setDismissed] = React.useState<Set<number>>(new Set())
  const [accepting, setAccepting] = React.useState<number | null>(null)
  const [flash, setFlash] = React.useState(false)
  const [online, setOnline] = React.useState(true)
  const [lastCheck, setLastCheck] = React.useState<Date>(new Date())

  const dismissedRef = React.useRef(dismissed)
  dismissedRef.current = dismissed

  const notifyNew = React.useCallback(() => {
    setFlash(true)
    setTimeout(() => setFlash(false), 800)
    playAlert()
    try { navigator.vibrate?.([150, 80, 150, 80, 300]) } catch {}
  }, [])

  // Polling every 2.5s
  React.useEffect(() => {
    const knownIds = new Set<number>()
    let first = true

    const poll = async () => {
      try {
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("status", "Ожидает отправки")
          .order("created_at", { ascending: false })
          .limit(30)

        if (!data) return
        setOnline(true)
        setLastCheck(new Date())

        const fresh = data as Order[]
        const newOnes = fresh.filter((o) => !knownIds.has(o.id) && !first)
        if (newOnes.length > 0) notifyNew()
        fresh.forEach((o) => knownIds.add(o.id))
        first = false

        setOrders(fresh)
      } catch {
        setOnline(false)
      }
    }

    poll()
    const id = setInterval(poll, 2500)
    return () => clearInterval(id)
  }, [supabase, notifyNew])

  // Supabase Realtime on top
  React.useEffect(() => {
    const channel = supabase
      .channel("dispatch-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const o = payload.new as Order
        if (o.status === "Ожидает отправки") {
          setOrders((prev) => (prev.some((p) => p.id === o.id) ? prev : [o, ...prev]))
          notifyNew()
        }
      })
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [supabase, notifyNew])

  async function handleAccept(order: Order) {
    setAccepting(order.id)
    try {
      await updateOrderStatus(order.id, "В пути")
      setDismissed((prev) => new Set([...prev, order.id]))
    } finally {
      setAccepting(null)
    }
  }

  function handleDecline(id: number) {
    setDismissed((prev) => new Set([...prev, id]))
  }

  const visible = orders.filter((o) => !dismissed.has(o.id))

  return (
    <div className="relative flex flex-col gap-6 p-4 lg:p-6">
      {/* Flash overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-500"
        style={{
          background: "radial-gradient(circle at center, rgba(34,197,94,0.18) 0%, transparent 65%)",
          opacity: flash ? 1 : 0,
        }}
      />

      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{
              background: online ? "#22c55e" : "#f59e0b",
              boxShadow: online ? "0 0 0 3px rgba(34,197,94,0.2)" : "0 0 0 3px rgba(245,158,11,0.2)",
              animation: "dispatch-pulse 2s infinite",
            }}
          />
          <span className="text-sm font-medium">{online ? "Онлайн — слежу за новыми заявками" : "Синхронизация..."}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Обновлено: {lastCheck.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>

      {visible.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 text-sm">
              <span
                className="size-1.5 rounded-full bg-amber-500"
                style={{ animation: "dispatch-pulse 1.2s infinite" }}
              />
              {visible.length} {visible.length === 1 ? "заявка ожидает" : visible.length < 5 ? "заявки ожидают" : "заявок ожидают"}
            </Badge>
            <span className="text-xs text-muted-foreground">— принимайте или отклоняйте</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {visible.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                accepting={accepting === order.id}
                onAccept={() => handleAccept(order)}
                onDecline={() => handleDecline(order.id)}
              />
            ))}
          </div>
        </>
      )}

      <style>{`
        @keyframes dispatch-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

function OrderCard({
  order,
  accepting,
  onAccept,
  onDecline,
}: {
  order: Order
  accepting: boolean
  onAccept: () => void
  onDecline: () => void
}) {
  const route = parseRoute(order.driver)

  return (
    <Card className="overflow-hidden border-amber-500/30 shadow-sm">
      {/* Top stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400" />

      <CardContent className="flex flex-col gap-4 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-bold leading-none">{order.order_number}</p>
            <p className="mt-1 text-xs text-muted-foreground">{timeAgo(order.created_at)}</p>
          </div>
          <Badge className="shrink-0 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
            Ожидает
          </Badge>
        </div>

        {/* Cargo */}
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
          <span className="text-xl">📦</span>
          <div>
            <p className="text-sm font-semibold">{order.cargo_type}</p>
            <p className="text-xs text-muted-foreground">
              {[order.weight && `${order.weight.toLocaleString("ru-RU")} кг`, order.volume && `${order.volume} м³`]
                .filter(Boolean)
                .join(" · ") || "Вес не указан"}
            </p>
          </div>
        </div>

        {/* Route */}
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <div className="mt-1 size-2 shrink-0 rounded-full bg-sky-500" style={{ boxShadow: "0 0 6px rgba(14,165,233,0.6)" }} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Откуда</p>
              {order.sender_name && <p className="truncate text-sm font-medium">{order.sender_name}</p>}
              {order.sender_address && <p className="truncate text-xs text-muted-foreground">{order.sender_address}</p>}
            </div>
          </div>
          <div className="ml-0.5 flex items-center gap-2">
            <div className="flex flex-col gap-[3px] pl-[3px]">
              <span className="block size-1 rounded-full bg-border" />
              <span className="block size-1 rounded-full bg-border" />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {route?.isLand ? "🛣️ Автодорога" : "🌊 Каспийское море"}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-1 size-2 shrink-0 rounded-full bg-green-500" style={{ boxShadow: "0 0 6px rgba(34,197,94,0.6)" }} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Куда</p>
              {order.recipient_name && <p className="truncate text-sm font-medium">{order.recipient_name}</p>}
              {order.recipient_address && <p className="truncate text-xs text-muted-foreground">{order.recipient_address}</p>}
            </div>
          </div>
        </div>

        {/* Route card (ferry or land) */}
        {route && (
          <>
            <Separator />
            <div
              className={
                "flex items-center gap-2 rounded-lg px-3 py-2 border " +
                (route.isLand
                  ? "bg-amber-500/8 border-amber-500/20"
                  : "bg-sky-500/8 border-sky-500/20")
              }
            >
              <span className="text-lg">{route.isLand ? "🚛" : "🚢"}</span>
              <div className="flex-1 min-w-0">
                <p className={
                  "text-xs font-bold " +
                  (route.isLand ? "text-amber-600 dark:text-amber-400" : "text-sky-600 dark:text-sky-400")
                }>
                  {route.id} · {route.time}
                </p>
                <p className="truncate text-xs text-muted-foreground">{route.route}</p>
              </div>
              <Badge className={
                "shrink-0 text-[10px] " +
                (route.isLand
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20")
              }>
                ИИ ✨
              </Badge>
            </div>
          </>
        )}

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-red-500/30 text-red-600 hover:bg-red-500/5 hover:text-red-600 dark:text-red-400"
            onClick={onDecline}
            disabled={accepting}
          >
            ✗ Отклонить
          </Button>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={onAccept}
            disabled={accepting}
          >
            {accepting ? "⏳ Принимаю..." : "✓ Принять"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  const [dots, setDots] = React.useState(0)
  React.useEffect(() => {
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 700)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex gap-3 text-5xl" style={{ animation: "dispatch-pulse 3s ease-in-out infinite" }}>
        <span>🚢</span>
        <span>🚛</span>
      </div>
      <div>
        <p className="text-base font-semibold">Нет входящих заявок</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Новые грузы появятся автоматически{".".repeat(dots)}
        </p>
      </div>
      <p className="max-w-xs text-xs text-muted-foreground">
        Создайте паромный или сухопутный заказ — он появится здесь мгновенно
      </p>
    </div>
  )
}
