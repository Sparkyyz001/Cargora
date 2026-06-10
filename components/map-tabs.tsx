"use client"

import * as React from "react"
import {
  IconAnchor, IconArrowDown, IconArrowUp, IconShip, IconTruck,
  IconClock, IconRoute, IconRefresh, IconMapPin,
  IconLoader2, IconSearch, IconX, IconArrowLeft,
  IconGauge, IconCompass, IconRuler, IconTag, IconBroadcast,
} from "@tabler/icons-react"
import type { Order } from "@/lib/actions/orders"
import type { LandRoute } from "@/lib/actions/land-routes"
import { LiveMap } from "@/components/live-map"
import { Badge } from "@/components/ui/badge"

// ─── Types ────────────────────────────────────────────────────────────────────

type BaseVessel = {
  id: string; name: string; flag: string; country: string
  cargo: string; status: string; dwt: string; mmsi: number
  lat: number; lng: number; distKm: number; speedKt: number
  // detail fields
  imo?: string; callSign?: string; loa?: string; beam?: string
  course?: number; heading?: number; draught?: string; navStatus?: string
  aisSource?: string; vesselType?: string
}
type ArrVessel = BaseVessel & { direction: "arriving";  from: string }
type DepVessel = BaseVessel & { direction: "departing"; to: string; departure: string; slots: string }
type Vessel = ArrVessel | DepVessel

// ─── Vessel seed data ─────────────────────────────────────────────────────────
const AKTAU = { lat: 43.652, lng: 51.168 }

const SEED: Vessel[] = [
  // ══ ARRIVING ═══════════════════════════════════════════════════════════════
  {
    id:"v01", direction:"arriving", name:"NARGOON", flag:"🇮🇷", country:"Иран",
    mmsi:422052500, imo:"8871974", callSign:"EPCO6",
    vesselType:"Сухогруз", loa:"88.91 м", beam:"12.3 м",
    from:"Анзали",    distKm:310, speedKt:7.5,
    course:79, heading:75, draught:"2.2 м", navStatus:"На ходу (двигатель)",
    aisSource:"Наземный АИС",
    cargo:"Генеральный груз", status:"В пути", dwt:"3 200 т",
    lat:40.80, lng:49.20,
  },
  {
    id:"v02", direction:"arriving", name:"Bereket", flag:"🇹🇲", country:"Туркменистан",
    mmsi:434519000, imo:"9134872", callSign:"EZ7001",
    vesselType:"Нефтяной танкер", loa:"105.2 м", beam:"16.4 м",
    from:"Туркменбаши", distKm:87, speedKt:12.4,
    course:335, heading:332, draught:"3.8 м", navStatus:"На ходу (двигатель)",
    aisSource:"Наземный АИС",
    cargo:"Сырая нефть", status:"В пути", dwt:"5 800 т",
    lat:42.55, lng:52.05,
  },
  {
    id:"v03", direction:"arriving", name:"Oguzhan", flag:"🇹🇲", country:"Туркменистан",
    mmsi:434209000, imo:"8901234", callSign:"EZ7002",
    vesselType:"Нефтяной танкер", loa:"98.4 м", beam:"15.2 м",
    from:"Туркменбаши", distKm:220, speedKt:11.2,
    course:330, heading:328, draught:"3.5 м", navStatus:"На ходу (двигатель)",
    aisSource:"Наземный АИС",
    cargo:"Нефтепродукты", status:"В пути", dwt:"4 200 т",
    lat:41.60, lng:52.55,
  },
  {
    id:"v04", direction:"arriving", name:"Akademik Topchubashov", flag:"🇦🇿", country:"Азербайджан",
    mmsi:423131700, imo:"9001456", callSign:"4JNP",
    vesselType:"Нефтяной танкер", loa:"119.8 м", beam:"17.0 м",
    from:"Баку",         distKm:412, speedKt:9.8,
    course:45, heading:43, draught:"4.1 м", navStatus:"На ходу (двигатель)",
    aisSource:"Наземный АИС",
    cargo:"Сырая нефть", status:"В пути", dwt:"6 400 т",
    lat:41.95, lng:50.55,
  },
  {
    id:"v05", direction:"arriving", name:"Shamkir", flag:"🇦🇿", country:"Азербайджан",
    mmsi:423141100, imo:"9112233", callSign:"4JKM",
    vesselType:"Нефтяной танкер", loa:"107.6 м", beam:"16.0 м",
    from:"Баку",         distKm:180, speedKt:10.5,
    course:40, heading:38, draught:"3.9 м", navStatus:"На ходу (двигатель)",
    aisSource:"Наземный АИС",
    cargo:"Мазут", status:"В пути", dwt:"5 100 т",
    lat:42.80, lng:51.25,
  },
  {
    id:"v06", direction:"arriving", name:"Merkuriy", flag:"🇷🇺", country:"Россия",
    mmsi:273359430, imo:"7801124", callSign:"UBSM",
    vesselType:"Сухогруз", loa:"92.0 м", beam:"13.5 м",
    from:"Махачкала",    distKm:290, speedKt:11.1,
    course:95, heading:93, draught:"3.1 м", navStatus:"На ходу (двигатель)",
    aisSource:"Наземный АИС",
    cargo:"Нефтепродукты", status:"В пути", dwt:"3 800 т",
    lat:43.20, lng:49.40,
  },
  {
    id:"v07", direction:"arriving", name:"Petrovsk", flag:"🇷🇺", country:"Россия",
    mmsi:273340700, imo:"7901823", callSign:"UBWP",
    vesselType:"Сухогруз / навалом", loa:"110.3 м", beam:"15.8 м",
    from:"Астрахань",    distKm:510, speedKt:8.5,
    course:170, heading:168, draught:"3.6 м", navStatus:"На ходу (двигатель)",
    aisSource:"Наземный АИС",
    cargo:"Зерно / навалом", status:"В пути", dwt:"4 900 т",
    lat:45.10, lng:49.90,
  },
  // ══ DEPARTING ══════════════════════════════════════════════════════════════
  {
    id:"v08", direction:"departing", name:"Казахстан", flag:"🇰🇿", country:"Казахстан",
    mmsi:436013001, imo:"9200011", callSign:"UNKA",
    vesselType:"Паром / Ро-ро", loa:"125.0 м", beam:"18.5 м",
    to:"Туркменбаши", departure:"14:30", slots:"8 слотов",
    course:0, heading:0, draught:"4.2 м", navStatus:"Стоит у причала",
    aisSource:"Наземный АИС",
    distKm:0, speedKt:0, cargo:"Сырая нефть", status:"Погрузка", dwt:"6 000 т",
    lat:43.645, lng:51.195,
  },
  {
    id:"v09", direction:"departing", name:"Мангыстау", flag:"🇰🇿", country:"Казахстан",
    mmsi:436013003, imo:"9200033", callSign:"UNKC",
    vesselType:"Паром / Ро-ро", loa:"118.0 м", beam:"17.5 м",
    to:"Туркменбаши", departure:"Завтра 08:00", slots:"12 слотов",
    course:0, heading:0, draught:"3.8 м", navStatus:"На якоре",
    aisSource:"Наземный АИС",
    distKm:0, speedKt:0, cargo:"Нефтепродукты", status:"Ожидание", dwt:"5 500 т",
    lat:43.635, lng:51.185,
  },
  {
    id:"v10", direction:"departing", name:"Astana", flag:"🇰🇿", country:"Казахстан",
    mmsi:436013002, imo:"9200022", callSign:"UNKB",
    vesselType:"Контейнеровоз", loa:"112.0 м", beam:"16.8 м",
    to:"Баку", departure:"20:00", slots:"3 слота",
    course:0, heading:0, draught:"3.5 м", navStatus:"Стоит у причала",
    aisSource:"Наземный АИС",
    distKm:0, speedKt:0, cargo:"Контейнеры", status:"Ожидание", dwt:"4 800 т",
    lat:43.660, lng:51.155,
  },
  {
    id:"v11", direction:"departing", name:"Актюбе", flag:"🇰🇿", country:"Казахстан",
    mmsi:436013004, imo:"9200044", callSign:"UNKD",
    vesselType:"Сухогруз / навалом", loa:"102.4 м", beam:"15.0 м",
    to:"Махачкала", departure:"Завтра 06:00", slots:"6 слотов",
    course:0, heading:0, draught:"3.2 м", navStatus:"Стоит у причала",
    aisSource:"Наземный АИС",
    distKm:0, speedKt:0, cargo:"Зерно / пшеница", status:"Погрузка", dwt:"3 900 т",
    lat:43.650, lng:51.175,
  },
  {
    id:"v12", direction:"departing", name:"Нур-Султан", flag:"🇰🇿", country:"Казахстан",
    mmsi:436013005, imo:"9200055", callSign:"UNKE",
    vesselType:"Сухогруз", loa:"96.0 м", beam:"14.5 м",
    to:"Анзали", departure:"Послезавтра 10:00", slots:"15 слотов",
    course:0, heading:0, draught:"2.9 м", navStatus:"На якоре",
    aisSource:"Наземный АИС",
    distKm:0, speedKt:0, cargo:"Генеральный груз", status:"Ожидание", dwt:"5 200 т",
    lat:43.640, lng:51.200,
  },
]

// ─── Live helpers ─────────────────────────────────────────────────────────────
function stepToward(lat: number, lng: number, tLat: number, tLng: number, km: number) {
  const dLat = tLat - lat, dLng = tLng - lng
  const d = Math.sqrt(dLat * dLat + dLng * dLng) * 111
  if (d < 0.1) return { lat, lng }
  const r = km / d
  return { lat: lat + dLat * r, lng: lng + dLng * r }
}
function etaStr(distKm: number, speedKt: number) {
  const h = distKm / (speedKt * 1.852)
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60)
  return hh === 0 ? `${mm} мин` : `${hh} ч ${String(mm).padStart(2,"0")} мин`
}
function jitter(kt: number) { return Math.round((kt + (Math.random()-.5)*.6)*10)/10 }

function buildUrl(lat: number, lng: number, zoom: number, mmsi: number) {
  return ["https://www.marinetraffic.com/en/ais/embed",
    `zoom:${zoom}`,`centery:${lat.toFixed(3)}`,`centerx:${lng.toFixed(3)}`,
    "maptype:4","shownames:true",`mmsi:${mmsi}`,
    "shipid:0","fleet:","fleet_id:","vtypes:","showmenu:","remember:false",
  ].join("/")
}
const DEFAULT_URL = buildUrl(43.0, 51.5, 7, 0)

// ─── UI helpers ───────────────────────────────────────────────────────────────
function StatusDot({ s }: { s: string }) {
  const c = s==="В пути"?"bg-emerald-500":s==="Погрузка"?"bg-amber-400":s==="На якоре"?"bg-rose-400":"bg-sky-400"
  return <span className={`inline-block size-2 rounded-full ${c} shrink-0`} />
}
function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 text-xs">
      <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
      <span className="text-muted-foreground min-w-[90px] shrink-0">{label}</span>
      <span className="font-medium text-foreground break-all">{value}</span>
    </div>
  )
}
function searchMatch(v: Vessel, q: string) {
  const t = q.toLowerCase()
  const port = v.direction==="arriving" ? v.from : v.to
  return v.name.toLowerCase().includes(t) || v.cargo.toLowerCase().includes(t) ||
    v.country.toLowerCase().includes(t) || port.toLowerCase().includes(t) ||
    (v.imo ?? "").includes(t) || String(v.mmsi).includes(t)
}

// ─── VesselCard (list view) ───────────────────────────────────────────────────
function VesselCard({ v, selected, onSelect, onDetail }: {
  v: Vessel; selected: boolean; onSelect: () => void; onDetail: () => void
}) {
  const isArr = v.direction === "arriving"
  return (
    <div className={[
      "rounded-xl border transition-all duration-100",
      selected ? "border-primary bg-primary/8 ring-1 ring-primary/20 shadow-sm" : "border-border bg-card",
    ].join(" ")}>
      <button type="button" onClick={onSelect}
        className="w-full text-left px-3.5 pt-3 pb-2 cursor-pointer hover:bg-accent/30 transition-colors rounded-t-xl">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm leading-none">{v.flag}</span>
            <span className="font-semibold text-sm truncate">{v.name}</span>
            {selected && <IconMapPin className="size-3.5 text-primary shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusDot s={v.status} />
            <span className="text-[10px] text-muted-foreground">{v.status}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <IconRoute className="size-3 shrink-0" />
            <span className="truncate">{isArr ? `из ${(v as ArrVessel).from}` : `→ ${(v as DepVessel).to}`}</span>
          </div>
          <div className="flex items-center gap-1">
            <IconClock className="size-3 shrink-0" />
            <span className="font-medium text-foreground">
              {isArr ? (v.distKm>0 ? etaStr(v.distKm,v.speedKt) : "Прибыл") : `Отпр. ${(v as DepVessel).departure}`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <IconAnchor className="size-3 shrink-0" />
            <span className="truncate">{v.cargo}</span>
          </div>
          <div className="flex items-center justify-end">
            {isArr
              ? <span className="font-medium text-foreground">{v.speedKt.toFixed(1)} уз</span>
              : <Badge variant="outline" className="text-[9px] py-0 h-4">{(v as DepVessel).slots}</Badge>}
          </div>
        </div>
      </button>
      {/* Detail link */}
      <button type="button" onClick={onDetail}
        className="w-full rounded-b-xl border-t border-border/50 px-3.5 py-1.5 text-[11px] text-primary hover:bg-primary/5 transition-colors text-left flex items-center justify-between cursor-pointer">
        <span>Подробнее о судне</span>
        <span className="text-muted-foreground">›</span>
      </button>
    </div>
  )
}

// ─── VesselDetail panel ───────────────────────────────────────────────────────
function VesselDetail({ v, onBack }: { v: Vessel; onBack: () => void }) {
  const isArr = v.direction === "arriving"
  return (
    <div className="flex flex-col h-full">
      {/* Back */}
      <button type="button" onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors border-b cursor-pointer">
        <IconArrowLeft className="size-3.5" />Назад к списку
      </button>

      <div className="flex-1 overflow-y-auto">
        {/* Hero / photo placeholder */}
        <div className="relative h-36 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 20px,rgba(255,255,255,.05) 20px,rgba(255,255,255,.05) 21px),repeating-linear-gradient(90deg,transparent,transparent 20px,rgba(255,255,255,.05) 20px,rgba(255,255,255,.05) 21px)" }} />
          <div className="relative flex flex-col items-center gap-2">
            <IconShip className="size-14 text-white/30" />
            <span className="text-[10px] text-white/30 uppercase tracking-widest">АИС фото недоступно</span>
          </div>
          {/* Flag badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
            <span>{v.flag}</span>
            <span>{v.country}</span>
          </div>
          {/* Status badge */}
          <div className="absolute bottom-3 left-3">
            <span className={[
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium",
              v.status==="В пути" ? "bg-emerald-500/20 text-emerald-400" :
              v.status==="Погрузка" ? "bg-amber-500/20 text-amber-400" :
              "bg-sky-500/20 text-sky-400",
            ].join(" ")}>
              <span className="size-1.5 rounded-full bg-current" />{v.status}
            </span>
          </div>
        </div>

        {/* Name */}
        <div className="px-4 pt-3.5 pb-2 border-b">
          <h3 className="text-lg font-bold tracking-tight">{v.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{v.vesselType ?? "Грузовое судно"} · {v.dwt}</p>
        </div>

        {/* Identification */}
        <div className="px-4 py-3 border-b space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Идентификация</p>
          {v.imo     && <Row icon={<IconTag className="size-3.5"/>}       label="IMO"        value={v.imo} />}
          {v.mmsi    && <Row icon={<IconBroadcast className="size-3.5"/>} label="MMSI"       value={String(v.mmsi)} />}
          {v.callSign && <Row icon={<IconAnchor className="size-3.5"/>}   label="Позывной"   value={v.callSign} />}
          {v.loa     && <Row icon={<IconRuler className="size-3.5"/>}     label="Длина × ширина" value={`${v.loa} × ${v.beam ?? "—"}`} />}
        </div>

        {/* Navigation */}
        <div className="px-4 py-3 border-b space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Навигация</p>
          {v.speedKt > 0 && <Row icon={<IconGauge className="size-3.5"/>}   label="Скорость"   value={`${v.speedKt.toFixed(1)} уз`} />}
          {v.course != null && v.course > 0 && <Row icon={<IconCompass className="size-3.5"/>} label="Курс / Пеленг" value={`${v.course}° / ${v.heading ?? v.course}°`} />}
          {v.draught && <Row icon={<IconAnchor className="size-3.5"/>}       label="Осадка"     value={v.draught} />}
          {v.navStatus && <Row icon={<IconShip className="size-3.5"/>}       label="Статус"     value={v.navStatus} />}
          {v.aisSource && <Row icon={<IconBroadcast className="size-3.5"/>}  label="АИС"        value={v.aisSource} />}
        </div>

        {/* Route */}
        <div className="px-4 py-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Маршрут</p>
          {isArr
            ? <>
                <Row icon={<IconRoute className="size-3.5"/>}  label="Откуда"    value={(v as ArrVessel).from} />
                <Row icon={<IconMapPin className="size-3.5"/>} label="Назначение" value="Актау, Казахстан" />
                <Row icon={<IconClock className="size-3.5"/>}  label="ETA"       value={v.distKm > 0 ? etaStr(v.distKm, v.speedKt) : "Прибыл"} />
                <Row icon={<IconGauge className="size-3.5"/>}  label="Осталось"  value={`${v.distKm.toFixed(0)} км`} />
              </>
            : <>
                <Row icon={<IconMapPin className="size-3.5"/>} label="Порт вых."  value="Актау, Казахстан" />
                <Row icon={<IconRoute className="size-3.5"/>}  label="Назначение" value={(v as DepVessel).to} />
                <Row icon={<IconClock className="size-3.5"/>}  label="Отправление" value={(v as DepVessel).departure} />
                <Row icon={<IconAnchor className="size-3.5"/>} label="Свободно"   value={(v as DepVessel).slots} />
              </>
          }
        </div>
      </div>
    </div>
  )
}

// ─── MapTabs ──────────────────────────────────────────────────────────────────
const TICK_SEC    = 30
const REFRESH_SEC = 180

export function MapTabs({ orders, landRoutes }: { orders: Order[]; landRoutes: LandRoute[] }) {
  const [tab, setTab]               = React.useState<"ais"|"land"|"ferry">("ais")
  const [panel, setPanel]           = React.useState<"arriving"|"departing">("arriving")
  const [selectedId, setSelectedId] = React.useState<string|null>(null)
  const [detailId, setDetailId]     = React.useState<string|null>(null)
  const [loading, setLoading]       = React.useState(false)
  const [query, setQuery]           = React.useState("")
  const [vessels, setVessels]       = React.useState<Vessel[]>(SEED)
  const [countdown, setCountdown]   = React.useState(TICK_SEC)
  const [refreshIn, setRefreshIn]   = React.useState(REFRESH_SEC)
  const [flash, setFlash]           = React.useState(false)

  const iframeRef   = React.useRef<HTMLIFrameElement>(null)
  const selectedRef = React.useRef<string|null>(null)
  selectedRef.current = selectedId

  // Live position ticker
  React.useEffect(() => {
    const t = setInterval(() => {
      setVessels(prev => prev.map(v => {
        if (v.direction !== "arriving") return v
        const km = v.speedKt * 1.852 * (TICK_SEC / 3600)
        const newDist = Math.max(0, v.distKm - km)
        const { lat, lng } = stepToward(v.lat, v.lng, AKTAU.lat, AKTAU.lng, km)
        return { ...v, distKm: newDist, lat, lng, speedKt: jitter(v.speedKt) }
      }))
      setFlash(true); setTimeout(()=>setFlash(false), 800)
      setCountdown(TICK_SEC)
    }, TICK_SEC * 1000)
    return () => clearInterval(t)
  }, [])

  // Countdown + iframe auto-refresh
  React.useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => c > 0 ? c-1 : TICK_SEC)
      setRefreshIn(r => {
        if (r <= 1) {
          if (!selectedRef.current && iframeRef.current) iframeRef.current.src = DEFAULT_URL
          return REFRESH_SEC
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  function goTo(url: string) { setLoading(true); if (iframeRef.current) iframeRef.current.src = url }

  function handleSelect(v: Vessel) {
    if (selectedId === v.id) { setSelectedId(null); goTo(DEFAULT_URL) }
    else { setSelectedId(v.id); goTo(buildUrl(v.lat, v.lng, 11, v.mmsi)) }
  }

  const arriving  = vessels.filter(v => v.direction === "arriving")
  const departing = vessels.filter(v => v.direction === "departing")
  const base      = panel === "arriving" ? arriving : departing
  const list      = query.trim() ? vessels.filter(v => searchMatch(v, query.trim())) : base
  const isSearch  = Boolean(query.trim())
  const refreshPct = Math.round((refreshIn / REFRESH_SEC) * 100)
  const detailVessel = detailId ? vessels.find(v => v.id === detailId) : null

  return (
    <div className="flex flex-col" style={{ height:"calc(100svh - var(--header-height, 48px))" }}>

      {/* Tab bar */}
      <div className="flex shrink-0 items-center gap-1 border-b bg-background px-4 py-2">
        <button onClick={() => setTab("ais")} className={[
          "flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
          tab==="ais" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        ].join(" ")}>
          <IconShip className="size-4"/>Суда Каспия · АИС
        </button>
        <button onClick={() => setTab("land")} className={[
          "flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
          tab==="land" ? "bg-orange-600 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        ].join(" ")}>
          <IconTruck className="size-4"/>Автоперевозки · 2ГИС
        </button>
        <button onClick={() => setTab("ferry")} className={[
          "flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
          tab==="ferry" ? "bg-cyan-600 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        ].join(" ")}>
          <IconAnchor className="size-4"/>Паромы · Каспий
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {tab === "ais" && (
          <div className="absolute inset-0 flex">

            {/* Sidebar */}
            <div className="flex w-[300px] shrink-0 flex-col border-r bg-background overflow-hidden">

              {/* Detail view */}
              {detailVessel ? (
                <VesselDetail v={detailVessel} onBack={() => setDetailId(null)} />
              ) : (
                <>
                  {/* Header */}
                  <div className="shrink-0 border-b px-3 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-semibold text-sm">Морской порт Мангистау</h2>
                        <p className={["text-[10px] transition-colors duration-300", flash?"text-emerald-500 font-medium":"text-muted-foreground"].join(" ")}>
                          {flash ? "✓ Данные обновлены" : `АИС · обновление через ${countdown} с`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                          <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse"/>Live
                        </div>
                        <p className="text-[9px] text-muted-foreground">карта ×{Math.ceil(refreshIn/60)} мин</p>
                      </div>
                    </div>
                    <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary/40 transition-all duration-1000" style={{width:`${refreshPct}%`}}/>
                    </div>
                    {/* Search */}
                    <div className="relative">
                      <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"/>
                      <input type="text" placeholder="Поиск по названию, MMSI, порту…"
                        value={query} onChange={e=>setQuery(e.target.value)}
                        className="w-full rounded-lg border bg-muted/40 py-1.5 pl-8 pr-7 text-xs outline-none focus:border-primary focus:bg-background transition-colors"/>
                      {query && <button onClick={()=>setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><IconX className="size-3.5"/></button>}
                    </div>
                    {/* Toggle */}
                    {!isSearch && (
                      <div className="flex rounded-lg border bg-muted/40 p-0.5 text-[11px]">
                        <button onClick={()=>setPanel("arriving")} className={["flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 font-medium transition-colors",panel==="arriving"?"bg-background text-foreground shadow-sm":"text-muted-foreground hover:text-foreground"].join(" ")}>
                          <IconArrowDown className="size-3"/>В Мангистау ({arriving.length})
                        </button>
                        <button onClick={()=>setPanel("departing")} className={["flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 font-medium transition-colors",panel==="departing"?"bg-background text-foreground shadow-sm":"text-muted-foreground hover:text-foreground"].join(" ")}>
                          <IconArrowUp className="size-3"/>Из Мангистау ({departing.length})
                        </button>
                      </div>
                    )}
                    {isSearch && <p className="text-[11px] text-muted-foreground">{list.length>0?`Найдено ${list.length} — нажмите для фокуса`:"Ничего не найдено"}</p>}
                    {selectedId && !isSearch && (
                      <div className="flex items-center gap-1.5 text-[11px] text-primary">
                        <IconMapPin className="size-3 shrink-0"/><span>Карта на судне</span>
                        <button onClick={()=>{setSelectedId(null);goTo(DEFAULT_URL)}} className="ml-auto text-muted-foreground underline hover:no-underline">сбросить</button>
                      </div>
                    )}
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-1.5">
                    {list.length===0 && <p className="text-xs text-muted-foreground text-center pt-8">Нет результатов</p>}
                    {list.map(v=>(
                      <VesselCard key={v.id} v={v}
                        selected={selectedId===v.id}
                        onSelect={()=>handleSelect(v)}
                        onDetail={()=>{setDetailId(v.id);handleSelect(v)}}/>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="shrink-0 border-t px-3 py-2 grid grid-cols-4 gap-1 text-center text-[10px]">
                    <div><p className="font-semibold">{arriving.length}</p><p className="text-muted-foreground">Прибыв.</p></div>
                    <div><p className="font-semibold">{departing.length}</p><p className="text-muted-foreground">Убыв.</p></div>
                    <div><p className="font-semibold">{vessels.length}</p><p className="text-muted-foreground">Всего</p></div>
                    <div><p className="font-semibold text-emerald-500">5</p><p className="text-muted-foreground">Стран</p></div>
                  </div>
                </>
              )}
            </div>

            {/* iframe */}
            <div className="relative flex-1 overflow-hidden bg-muted">
              <iframe ref={iframeRef} src={DEFAULT_URL} className="h-full w-full border-0"
                allowFullScreen onLoad={()=>setLoading(false)} title="MarineTraffic — Морской порт Мангистау"/>
              {loading && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2.5">
                    <IconLoader2 className="size-7 animate-spin text-primary"/>
                    <p className="text-xs text-muted-foreground">Позиция судна загружается…</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2GIS — Автоперевозки (land) */}
        <div className={["absolute inset-0",tab==="land"?"z-10":"-z-10 pointer-events-none opacity-0"].join(" ")}>
          <LiveMap orders={orders} landRoutes={landRoutes} mode="land"/>
        </div>

        {/* 2GIS — Паромы (ferry) */}
        <div className={["absolute inset-0",tab==="ferry"?"z-10":"-z-10 pointer-events-none opacity-0"].join(" ")}>
          <LiveMap orders={orders} landRoutes={landRoutes} mode="ferry"/>
        </div>
      </div>
    </div>
  )
}
