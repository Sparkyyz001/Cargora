"use client"

import * as React from "react"
import { load } from "@2gis/mapgl"

import type { Order } from "@/lib/actions/orders"
import type { LandRoute } from "@/lib/actions/land-routes"
import { findCityBase } from "@/lib/geo"
import { cn } from "@/lib/utils"

const MAP_KEY = process.env.NEXT_PUBLIC_2GIS_API_KEY

type MapGL       = Awaited<ReturnType<typeof load>>
type MapInstance = InstanceType<MapGL["Map"]>
type MarkerInst  = InstanceType<MapGL["Marker"]>
type Line        = { destroy(): void }

// ── Status helpers ────────────────────────────────────────────────
const IN_TRANSIT = ["В пути", "Жолда"]
const WAITING    = ["Ожидает отправки", "Жіберілуді күтуде"]
const DELIVERED  = ["Доставлен", "Жеткізілді"]

const FERRY_DEST = ["туркменбаши", "баку", "алят", "нефтчала", "амирабад"]
function isFerry(sender: string | null, recipient: string | null) {
  if (!sender || !recipient) return false
  return sender.toLowerCase().includes("актау") &&
    FERRY_DEST.some((k) => recipient.toLowerCase().includes(k))
}

// ── Sea route geometry ────────────────────────────────────────────
import type { LatLng } from "@/lib/geo"

const CASPIAN: LatLng = { lat: 41.2, lng: 51.1 }

function bezier(from: LatLng, to: LatLng, ctrl: LatLng, steps = 48): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t
    pts.push([
      u * u * from.lng + 2 * u * t * ctrl.lng + t * t * to.lng,
      u * u * from.lat + 2 * u * t * ctrl.lat + t * t * to.lat,
    ])
  }
  return pts
}
function seaCtrl(from: LatLng, to: LatLng, orderNum: string): LatLng {
  const mid = { lat: (from.lat + to.lat) / 2, lng: (from.lng + to.lng) / 2 }
  const base = { lat: mid.lat * 0.32 + CASPIAN.lat * 0.68, lng: mid.lng * 0.32 + CASPIAN.lng * 0.68 }
  let h = 0
  for (const c of orderNum) { h = (h << 5) - h + c.charCodeAt(0); h |= 0 }
  return { lat: base.lat + (((Math.abs(h) % 100) / 100) * 2 - 1) * 0.65, lng: base.lng + (((Math.abs(h) % 100) / 100) * 2 - 1) * 0.35 }
}

function ptAt(pts: [number, number][], t: number): [number, number] {
  return pts[Math.round(Math.min(1, Math.max(0, t)) * (pts.length - 1))]
}
function sliceTo(pts: [number, number][], t: number): [number, number][] {
  return pts.slice(0, Math.max(1, Math.round(Math.min(1, t) * (pts.length - 1))) + 1)
}
function stablePct(num: string) {
  let h = 0
  for (const c of num) { h = (h << 5) - h + c.charCodeAt(0); h |= 0 }
  return 0.06 + (Math.abs(h) % 84) / 100
}

// ── SVG icons ─────────────────────────────────────────────────────
const enc = (s: string) => `data:image/svg+xml,${encodeURIComponent(s)}`

const shipIcon = (fill: string) => enc(
  `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">` +
  `<circle cx="21" cy="21" r="19" fill="${fill}" stroke="#fff" stroke-width="2.5"/>` +
  `<path d="M8 24h26l-3.5 7H11.5z" fill="#fff"/>` +
  `<rect x="13" y="15" width="16" height="9" fill="#fff" rx="2"/>` +
  `<rect x="19" y="9" width="4" height="7" fill="#fff" rx="1.5"/>` +
  `<rect x="24" y="11" width="3" height="5" fill="#fff" rx="1"/></svg>`
)
const truckIcon = (fill: string) => enc(
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">` +
  `<circle cx="20" cy="20" r="18" fill="${fill}" stroke="#fff" stroke-width="2.5"/>` +
  `<rect x="8" y="13" width="14" height="12" fill="#fff" rx="2"/>` +
  `<path d="M22 17h7l2.5 5v3.5H22z" fill="#fff"/>` +
  `<circle cx="14" cy="28" r="3.5" fill="${fill}" stroke="#fff" stroke-width="2"/>` +
  `<circle cx="30" cy="28" r="3.5" fill="${fill}" stroke="#fff" stroke-width="2"/></svg>`
)
const waitingPin = () => enc(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">` +
  `<path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20S24 21 24 12C24 5.4 18.6 0 12 0z" fill="#f59e0b"/>` +
  `<circle cx="12" cy="12" r="5.5" fill="#fff" opacity=".95"/></svg>`
)
const deliveredPin = () => enc(
  `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="29" viewBox="0 0 22 29">` +
  `<path d="M11 0C4.9 0 0 4.9 0 11c0 8.5 11 18 11 18S22 19.5 22 11C22 4.9 17.1 0 11 0z" fill="#16a34a"/>` +
  `<path d="M5.5 11l4.5 4.5 7-8" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`
)
const truckWaitPin = () => enc(
  `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">` +
  `<path d="M13 0C6 0 0 6 0 13c0 9.5 13 21 13 21S26 22.5 26 13C26 6 20 0 13 0z" fill="#ea580c"/>` +
  `<circle cx="13" cy="13" r="5.5" fill="#fff" opacity=".9"/>` +
  `<rect x="8" y="10" width="5" height="5" fill="#ea580c" rx="1"/>` +
  `<path d="M13 11h4l1.5 2.5v2H13z" fill="#ea580c"/></svg>`
)

// ── Format helpers ────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
}
function fmtWeight(w: number | null) {
  if (!w) return null
  return w >= 1000 ? `${(w / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} т` : `${w} кг`
}

// ── Internal per-item data refs ───────────────────────────────────
type ODat = { marker: MarkerInst; from?: LatLng; to?: LatLng; startPct?: number; isStatic?: boolean; routePts?: [number, number][] }
type LDat = { marker: MarkerInst; routePts: [number, number][]; startPct: number; status: string }

// ── Known road city names (for route stops display) ───────────────
const CITY_MAP: Record<string, string> = {
  "51.1726,43.6539": "Актау",
  "52.0974,43.5461": "Жетыбай",
  "52.1433,44.1792": "Шетпе",
  "55.1971,45.3180": "Бейнеу",
  "54.0248,47.0173": "Кульсары",
  "53.3304,47.6455": "Макат",
  "51.8830,47.1164": "Атырау",
  "58.1340,48.8190": "Эмба",
  "57.2094,50.2839": "Актобе",
  "71.4704,51.1605": "Астана",
  "61.6720,46.7990": "Аральск",
  "65.5092,44.8528": "Кызылорда",
  "69.5901,42.3000": "Шымкент",
  "72.9000,42.8500": "Тараз",
  "76.8897,43.2389": "Алматы",
}
function cityLabel(pt: [number, number]) {
  return CITY_MAP[`${pt[0]},${pt[1]}`] ?? null
}

// ── Component ─────────────────────────────────────────────────────
export type LiveMapMode = "land" | "ferry"

export function LiveMap({
  orders,
  landRoutes,
  mode,
}: {
  orders: Order[]
  landRoutes: LandRoute[]
  mode: LiveMapMode
}) {
  const containerRef  = React.useRef<HTMLDivElement>(null)
  const [error, setError]             = React.useState<string | null>(null)
  const [selectedFerry, setSelFerry]  = React.useState<number | null>(null)
  const [selectedLand, setSelLand]    = React.useState<number | null>(null)

  const mapRef    = React.useRef<MapInstance | null>(null)
  const mapglRef  = React.useRef<MapGL | null>(null)
  const odataRef  = React.useRef<Map<number, ODat>>(new Map())
  const ldataRef  = React.useRef<Map<number, LDat>>(new Map())
  const bgRef     = React.useRef<Line[]>([])
  const progFRef  = React.useRef<Map<number, Line>>(new Map())
  const progLRef  = React.useRef<Map<number, Line>>(new Map())
  const startRef  = React.useRef(Date.now())

  // ── Init map ───────────────────────────────────────────────────
  React.useEffect(() => {
    if (!MAP_KEY) { setError("NEXT_PUBLIC_2GIS_API_KEY не задан"); return }
    if (!containerRef.current) return
    let dead = false

    load().then((mapgl) => {
      if (dead || !containerRef.current) return
      mapglRef.current = mapgl

      // Different center/zoom per mode
      const center: [number, number] = mode === "land" ? [62.0, 47.0] : [51.5, 41.5]
      const zoom = mode === "land" ? 4.2 : 5.4

      const map = new mapgl.Map(containerRef.current, { center, zoom, key: MAP_KEY! })
      mapRef.current = map

      const mkLine = (coords: [number, number][], width: number, color: string): Line =>
        new mapgl.Polyline(map, { coordinates: coords, width, color }) as unknown as Line

      if (mode === "ferry") {
        // ── FERRY routes from orders ─────────────────────────
        for (const order of orders) {
          if (!isFerry(order.sender_address, order.recipient_address)) continue
          const from = findCityBase(order.sender_address)
          const to   = findCityBase(order.recipient_address)

          if (IN_TRANSIT.includes(order.status) && from && to) {
            const routePts = bezier(from, to, seaCtrl(from, to, order.order_number))
            bgRef.current.push(mkLine(routePts, 2.5, "#7dd3fc"))
            const t0 = stablePct(order.order_number)
            const prog = mkLine(sliceTo(routePts, t0), 3.5, "#0891b2")
            bgRef.current.push(prog)
            progFRef.current.set(order.id, prog)
            const m = new mapgl.Marker(map, { coordinates: ptAt(routePts, t0), icon: shipIcon("#0891b2"), size: [42,42], anchor: [21,21], zIndex: 10 })
            odataRef.current.set(order.id, { marker: m, from, to, startPct: t0, routePts })

          } else if (WAITING.includes(order.status) && from) {
            const routePts = to ? bezier(from, to, seaCtrl(from, to, order.order_number)) : null
            if (routePts) bgRef.current.push(mkLine(routePts, 1.5, "#bae6fd"))
            const m = new mapgl.Marker(map, { coordinates: [from.lng, from.lat], icon: waitingPin(), size: [24,32], anchor: [12,32], zIndex: 5 })
            odataRef.current.set(order.id, { marker: m, from, to: to ?? undefined, isStatic: true })

          } else if (DELIVERED.includes(order.status)) {
            const coord = to ?? from; if (!coord) continue
            if (from && to) bgRef.current.push(mkLine(bezier(from, to, seaCtrl(from, to, order.order_number)), 1, "#e0f2fe"))
            const m = new mapgl.Marker(map, { coordinates: [coord.lng, coord.lat], icon: deliveredPin(), size: [22,29], anchor: [11,29], zIndex: 3 })
            odataRef.current.set(order.id, { marker: m, from: from ?? undefined, to: coord, isStatic: true })
          }
        }
      } else {
        // ── LAND routes from Supabase ─────────────────────────
        for (const route of landRoutes) {
          const wpts = route.waypoints as [number, number][]
          if (!wpts || wpts.length < 2) continue
          const pct = Number(route.progress) || 0

          if (route.status === "В пути") {
            bgRef.current.push(mkLine(wpts, 2, "#fed7aa"))
            const prog = mkLine(sliceTo(wpts, pct), 4, "#ea580c")
            bgRef.current.push(prog)
            progLRef.current.set(route.id, prog)
            const m = new mapgl.Marker(map, { coordinates: ptAt(wpts, pct), icon: truckIcon("#ea580c"), size: [40,40], anchor: [20,20], zIndex: 12 })
            ldataRef.current.set(route.id, { marker: m, routePts: wpts, startPct: pct, status: route.status })

          } else if (route.status === "Ожидает отправки") {
            bgRef.current.push(mkLine(wpts, 1.5, "#fde68a"))
            const m = new mapgl.Marker(map, { coordinates: wpts[0], icon: truckWaitPin(), size: [26,34], anchor: [13,34], zIndex: 6 })
            ldataRef.current.set(route.id, { marker: m, routePts: wpts, startPct: 0, status: route.status })

          } else if (route.status === "Доставлен") {
            bgRef.current.push(mkLine(wpts, 1.5, "#d1fae5"))
            const last = wpts[wpts.length - 1]
            const m = new mapgl.Marker(map, { coordinates: last, icon: deliveredPin(), size: [22,29], anchor: [11,29], zIndex: 4 })
            ldataRef.current.set(route.id, { marker: m, routePts: wpts, startPct: 1, status: route.status })
          }
        }
      }
    }).catch(() => { if (!dead) setError("Ошибка загрузки карты 2ГИС") })

    return () => {
      dead = true
      odataRef.current.forEach((d) => d.marker.destroy()); odataRef.current.clear()
      ldataRef.current.forEach((d) => d.marker.destroy()); ldataRef.current.clear()
      bgRef.current.forEach((l) => l.destroy()); bgRef.current = []
      progFRef.current.forEach((l) => l.destroy()); progFRef.current.clear()
      progLRef.current.forEach((l) => l.destroy()); progLRef.current.clear()
      mapRef.current?.destroy(); mapRef.current = null; mapglRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // ── Tick: move vehicles ───────────────────────────────────────
  React.useEffect(() => {
    const t = setInterval(() => {
      const mapgl = mapglRef.current; const map = mapRef.current
      if (!mapgl || !map) return
      const hrs = (Date.now() - startRef.current) / 3_600_000

      odataRef.current.forEach(({ marker, startPct, isStatic, routePts }, oid) => {
        if (isStatic || !routePts || startPct === undefined) return
        const t2 = Math.min(0.97, startPct + hrs * 0.06)
        marker.setCoordinates(ptAt(routePts, t2))
        const nl = new mapgl.Polyline(map, { coordinates: sliceTo(routePts, t2), width: 3.5, color: "#0891b2" })
        progFRef.current.get(oid)?.destroy(); progFRef.current.set(oid, nl as unknown as Line)
      })

      ldataRef.current.forEach(({ marker, routePts, startPct, status }, lid) => {
        if (status !== "В пути") return
        const t2 = Math.min(0.97, startPct + hrs * 0.04)
        marker.setCoordinates(ptAt(routePts, t2))
        const nl = new mapgl.Polyline(map, { coordinates: sliceTo(routePts, t2), width: 4, color: "#ea580c" })
        progLRef.current.get(lid)?.destroy(); progLRef.current.set(lid, nl as unknown as Line)
      })
    }, 5000)
    return () => clearInterval(t)
  }, [])

  // ── Focus helpers ─────────────────────────────────────────────
  function flyTo(pos: [number, number], zoom: number) {
    const m = mapRef.current as unknown as { setCenter(c: [number, number]): void; setZoom(z: number): void } | null
    m?.setCenter(pos); m?.setZoom(zoom)
  }

  function handleFerry(orderId: number) {
    setSelFerry(orderId)
    const d = odataRef.current.get(orderId); if (!d) return
    if (!d.isStatic && d.routePts && d.startPct !== undefined) {
      const hrs = (Date.now() - startRef.current) / 3_600_000
      flyTo(ptAt(d.routePts, Math.min(0.97, d.startPct + hrs * 0.06)), 6)
    } else {
      const c = d.from ?? d.to; if (c) flyTo([c.lng, c.lat], 6)
    }
  }

  function handleLand(id: number) {
    setSelLand(id)
    const d = ldataRef.current.get(id); if (!d) return
    const hrs = (Date.now() - startRef.current) / 3_600_000
    const t = d.status === "В пути" ? Math.min(0.97, d.startPct + hrs * 0.04) : d.startPct
    flyTo(ptAt(d.routePts, t), 6)
  }

  // ── Derived ───────────────────────────────────────────────────
  const ferryOrders = orders.filter((o) => isFerry(o.sender_address, o.recipient_address))
  const selFO = selectedFerry != null ? orders.find((o) => o.id === selectedFerry) ?? null : null
  const selLR = selectedLand != null ? landRoutes.find((r) => r.id === selectedLand) ?? null : null

  const fCnt = {
    transit: ferryOrders.filter((o) => IN_TRANSIT.includes(o.status)).length,
    waiting: ferryOrders.filter((o) => WAITING.includes(o.status)).length,
    done: ferryOrders.filter((o) => DELIVERED.includes(o.status)).length,
  }
  const lCnt = {
    transit: landRoutes.filter((r) => r.status === "В пути").length,
    waiting: landRoutes.filter((r) => r.status === "Ожидает отправки").length,
    done: landRoutes.filter((r) => r.status === "Доставлен").length,
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left panel ── */}
      <div className="flex w-80 shrink-0 flex-col border-r bg-background">
        {mode === "land" ? (
          /* ── LAND panel ── */
          <>
            <div className="shrink-0 border-b px-3 py-2.5">
              <p className="mb-2 text-sm font-semibold">Автоперевозки · Казахстан</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip color="orange" label={`В пути · ${lCnt.transit}`} />
                <Chip color="amber"  label={`Ожидает · ${lCnt.waiting}`} />
                <Chip color="green"  label={`Сдано · ${lCnt.done}`} />
              </div>
            </div>
            {selLR ? (
              <LandDetail route={selLR} onClose={() => setSelLand(null)} startRef={startRef} />
            ) : (
              <>
                <div className="flex-1 divide-y divide-border overflow-y-auto">
                  {landRoutes.length === 0 && (
                    <p className="p-6 text-center text-xs text-muted-foreground">Маршруты загружаются…</p>
                  )}
                  {landRoutes.map((r) => (
                    <LandCard key={r.id} route={r} selected={selectedLand === r.id}
                      onClick={() => handleLand(r.id)} />
                  ))}
                </div>
                <Legend mode="land" />
              </>
            )}
          </>
        ) : (
          /* ── FERRY panel ── */
          <>
            <div className="shrink-0 border-b px-3 py-2.5">
              <p className="mb-2 text-sm font-semibold">Паромы · Каспийское море</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip color="cyan"  label={`В пути · ${fCnt.transit}`} />
                <Chip color="amber" label={`Ожидает · ${fCnt.waiting}`} />
                <Chip color="green" label={`Сдано · ${fCnt.done}`} />
              </div>
            </div>
            {selFO ? (
              <FerryDetail order={selFO} startRef={startRef} onClose={() => setSelFerry(null)} />
            ) : (
              <>
                <div className="flex-1 divide-y divide-border overflow-y-auto">
                  {ferryOrders.length === 0 && (
                    <p className="p-6 text-center text-xs text-muted-foreground">
                      Нет паромных заказов.<br/>
                      <span className="text-[10px]">Добавьте заказ: отправитель&nbsp;Актау, получатель&nbsp;Туркменбаши / Баку.</span>
                    </p>
                  )}
                  {ferryOrders.map((order) => {
                    const transit = IN_TRANSIT.includes(order.status)
                    const wait    = WAITING.includes(order.status)
                    return (
                      <button key={order.id} onClick={() => handleFerry(order.id)}
                        className={cn("w-full cursor-pointer px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                          selectedFerry === order.id && "bg-muted")}>
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold">{order.order_number}</span>
                          <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            transit && "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
                            wait    && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            !transit && !wait && "bg-green-600/10 text-green-700 dark:text-green-400")}>
                            {order.status}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">🚢 {order.cargo_type}</p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground/60">
                          {order.sender_address?.split(",")[0]} → {order.recipient_address?.split(",")[0]}
                        </p>
                      </button>
                    )
                  })}
                </div>
                <Legend mode="ferry" />
              </>
            )}
          </>
        )}
      </div>

      {/* ── Map ── */}
      {error ? (
        <div className="flex flex-1 items-center justify-center bg-muted/20 text-sm text-muted-foreground">{error}</div>
      ) : (
        <div ref={containerRef} className="h-full flex-1" />
      )}
    </div>
  )
}

// ── Land route card ───────────────────────────────────────────────
function LandCard({ route, selected, onClick }: { route: LandRoute; selected: boolean; onClick: () => void }) {
  const transit   = route.status === "В пути"
  const wait      = route.status === "Ожидает отправки"
  const delivered = route.status === "Доставлен"
  const pct = Math.round(Number(route.progress) * 100)
  return (
    <button onClick={onClick}
      className={cn("w-full cursor-pointer px-3 py-2.5 text-left transition-colors hover:bg-orange-50 dark:hover:bg-orange-950/20",
        selected && "bg-orange-50 dark:bg-orange-950/20")}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold truncate">{route.from_city} → {route.to_city}</span>
        <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
          transit   && "bg-orange-500/10 text-orange-600",
          wait      && "bg-amber-500/10 text-amber-600",
          delivered && "bg-green-600/10 text-green-700 dark:text-green-400")}>
          {route.status}
        </span>
      </div>
      <p className="truncate text-[11px] text-muted-foreground">🚛 {route.cargo}</p>
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground/70">
        <span>{route.distance}</span>
        <span>{route.vehicle}</span>
      </div>
      {transit && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-orange-100 dark:bg-orange-950">
          <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all"
            style={{ width: `${pct}%` }} />
        </div>
      )}
    </button>
  )
}

// ── Land detail ───────────────────────────────────────────────────
function LandDetail({ route, onClose, startRef }: { route: LandRoute; onClose: () => void; startRef: React.RefObject<number> }) {
  const transit = route.status === "В пути"
  const hrs = (Date.now() - (startRef.current ?? Date.now())) / 3_600_000
  const pct = transit
    ? Math.round(Math.min(0.97, Number(route.progress) + hrs * 0.04) * 100)
    : route.status === "Доставлен" ? 100 : 0

  const wpts = route.waypoints as [number, number][]
  const stops = wpts.map((pt, i) => ({ pt, i, name: cityLabel(pt) })).filter(s => s.name)
  const curIdx = Math.round((pct / 100) * (wpts.length - 1))

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center border-b px-3 py-2">
        <button onClick={onClose}
          className="flex items-center gap-1 rounded px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          ← Все автофуры
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-base leading-tight">{route.from_city} → {route.to_city}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{route.route_code} · {route.distance}</p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
            transit ? "bg-orange-500/15 text-orange-600" :
            route.status === "Ожидает отправки" ? "bg-amber-500/15 text-amber-600" :
            "bg-green-600/15 text-green-700 dark:text-green-400")}>
            {route.status}
          </span>
        </div>

        {/* Vehicle */}
        <div className="flex items-center gap-3 rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20 px-3 py-2.5">
          <span className="text-2xl">🚛</span>
          <div>
            <p className="font-semibold text-sm text-orange-700 dark:text-orange-400">{route.vehicle}</p>
            <p className="text-xs text-muted-foreground">{route.carrier}</p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Прогресс маршрута</span>
            <span className="font-bold tabular-nums">{pct}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-orange-100 dark:bg-orange-950">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all"
              style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>📍 {route.from_city}</span>
            <span>{route.to_city} 🏁</span>
          </div>
        </div>

        {/* Road stops */}
        {stops.length >= 2 && (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Точки маршрута</p>
            <div className="relative pl-3.5">
              <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-border" />
              {stops.map(({ i, name }, si) => {
                const passed = i <= curIdx
                return (
                  <div key={si} className="relative flex items-start gap-2.5 pb-2.5 last:pb-0">
                    <div className={cn("relative z-10 mt-1 size-2.5 shrink-0 rounded-full border-2 transition-colors",
                      passed ? "border-orange-500 bg-orange-500" : "border-muted-foreground/40 bg-background")} />
                    <div>
                      <p className={cn("text-xs font-medium leading-tight", passed ? "text-foreground" : "text-muted-foreground")}>
                        {name}
                      </p>
                      {si === 0 && <p className="text-[10px] text-muted-foreground">Отправление</p>}
                      {si === stops.length - 1 && <p className="text-[10px] text-muted-foreground">Пункт назначения</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Info */}
        <InfoSection title="Груз и время">
          <InfoRow label="Груз"      value={route.cargo} />
          <InfoRow label="ETA"       value={route.eta} />
          <InfoRow label="Расстояние" value={route.distance} />
        </InfoSection>
        <InfoSection title="Перевозчик">
          <InfoRow label="Компания"  value={route.carrier} />
          <InfoRow label="Номер ТС"  value={route.vehicle} />
        </InfoSection>
      </div>
    </div>
  )
}

// ── Ferry detail ──────────────────────────────────────────────────
function FerryDetail({ order, startRef, onClose }: { order: Order; startRef: React.RefObject<number>; onClose: () => void }) {
  const transit = IN_TRANSIT.includes(order.status)
  const wait    = WAITING.includes(order.status)
  const hrs = (Date.now() - (startRef.current ?? Date.now())) / 3_600_000
  const pct = transit ? Math.round(Math.min(0.97, stablePct(order.order_number) + hrs * 0.06) * 100) : wait ? 0 : 100

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center border-b px-3 py-2">
        <button onClick={onClose}
          className="flex items-center gap-1 rounded px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          ← Все рейсы
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xl font-bold">{order.order_number}</span>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold",
            transit && "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
            wait    && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
            !transit && !wait && "bg-green-600/15 text-green-700 dark:text-green-400")}>
            {order.status}
          </span>
        </div>
        <div className="flex items-start gap-2.5 rounded-lg bg-muted/40 p-3">
          <span className="mt-0.5 text-2xl">🚢</span>
          <div>
            <p className="font-medium leading-tight">{order.cargo_type}</p>
            <p className="text-xs text-muted-foreground">Паромный маршрут · Каспийское море</p>
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Прогресс</span>
            <span className="font-semibold tabular-nums">{pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{order.sender_address?.split(",")[0]}</span>
            <span>{order.recipient_address?.split(",")[0]}</span>
          </div>
        </div>
        <InfoSection title="Отправитель">
          <InfoRow label="Компания" value={order.sender_name} />
          <InfoRow label="Адрес"    value={order.sender_address} />
          {order.sender_phone && <InfoRow label="Телефон" value={order.sender_phone} />}
        </InfoSection>
        <InfoSection title="Получатель">
          <InfoRow label="Компания" value={order.recipient_name} />
          <InfoRow label="Адрес"    value={order.recipient_address} />
          {order.recipient_phone && <InfoRow label="Телефон" value={order.recipient_phone} />}
        </InfoSection>
        <InfoSection title="Детали">
          <InfoRow label="Создан"   value={fmtDate(order.created_at)} />
          {order.weight && <InfoRow label="Вес"    value={fmtWeight(order.weight)!} />}
          {order.volume && <InfoRow label="Объём"  value={`${order.volume} м³`} />}
          {order.delivery_date && <InfoRow label="Срок" value={fmtDate(order.delivery_date)} />}
        </InfoSection>
      </div>
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────
function Legend({ mode }: { mode: LiveMapMode }) {
  const items = mode === "land"
    ? [
        { color: "bg-orange-500", label: "Автофура в пути" },
        { color: "bg-orange-200", label: "Запланированный маршрут" },
        { color: "bg-amber-400",  label: "Ожидает отправки" },
        { color: "bg-green-500",  label: "Доставлен" },
      ]
    : [
        { color: "bg-cyan-500",  label: "Паром в пути (Каспий)" },
        { color: "bg-sky-200",   label: "Запланированный рейс" },
        { color: "bg-amber-400", label: "Ожидает отправки" },
        { color: "bg-green-500", label: "Доставлен" },
      ]
  return (
    <div className="shrink-0 border-t p-3">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Легенда</p>
      <div className="space-y-1">
        {items.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("size-2.5 shrink-0 rounded-full", color)} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Shared ────────────────────────────────────────────────────────
function Chip({ color, label }: { color: "cyan" | "amber" | "green" | "orange"; label: string }) {
  const styles: Record<string, string> = {
    cyan:   "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    amber:  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    green:  "bg-green-600/10 text-green-700 dark:text-green-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  }
  const dots: Record<string, string> = { cyan: "bg-cyan-500", amber: "bg-amber-400", green: "bg-green-500", orange: "bg-orange-500" }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", styles[color])}>
      <span className={cn("size-1.5 rounded-full", dots[color])} />{label}
    </span>
  )
}
function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="overflow-hidden rounded-lg border bg-muted/20 divide-y divide-border">{children}</div>
    </div>
  )
}
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium leading-relaxed">{value}</span>
    </div>
  )
}
