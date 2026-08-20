"use client"

import * as React from "react"
import { load } from "@2gis/mapgl"

import { MAP_KEY_MISSING, mapLoadError, resolveMapKey } from "@/lib/map-key"
import { SETTLEMENTS } from "@/lib/mangystau"
import { roadBetween } from "@/lib/route-geometry"

// Карта автопарка области с симуляцией суток.
//
// Машины двигаются не по реальному времени, а по симулированным часам,
// которыми управляет ведущий: на скорости 10x сутки проходят за пару минут
// и движение видно из зала. Привязка к реальному времени давала сдвиг
// в сто метров за минуту показа — то есть маркер стоял намертво.

// Ключ берётся через resolveMapKey: в бандле его может не быть,
// если переменную добавили в окружение уже после сборки.

type MapGL = Awaited<ReturnType<typeof load>>
type MapInstance = InstanceType<MapGL["Map"]>
type MarkerInst = InstanceType<MapGL["Marker"]>
type Destroyable = { destroy(): void }

/** Центр Мангистауской области и масштаб, при котором она видна целиком. */
const CENTER: [number, number] = [52.4, 44.1]
const ZOOM = 6.6

const enc = (s: string) => `data:image/svg+xml,${encodeURIComponent(s)}`

const truckIcon = (fill: string) =>
  enc(
    `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="13" fill="${fill}" stroke="#fff" stroke-width="2.5"/>
      <path d="M10 19v-5h7v5h-7zm7-3h3l2 3h-5v-3z" fill="#fff"/>
      <circle cx="13" cy="21" r="1.6" fill="#fff"/><circle cx="21" cy="21" r="1.6" fill="#fff"/>
    </svg>`,
  )

const townIcon = (r: number, remote: boolean) =>
  enc(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r * 2}" height="${r * 2}" viewBox="0 0 ${r * 2} ${r * 2}">
      <circle cx="${r}" cy="${r}" r="${r - 2}" fill="${remote ? "#f59e0b" : "#64748b"}" fill-opacity="0.85" stroke="#fff" stroke-width="1.5"/>
    </svg>`,
  )

/**
 * Накопленные длины отрезков маршрута.
 *
 * Без них движение считается по номеру точки, а не по расстоянию: у плеча
 * в 150 км всего 17 точек, поэтому машина прыгала бы по 9 км за шаг.
 * Длины кэшируются — маршруты неизменны, пересчитывать их каждый тик незачем.
 */
const lengthCache = new WeakMap<[number, number][], { cum: number[]; total: number }>()

function cumulative(pts: [number, number][]) {
  const hit = lengthCache.get(pts)
  if (hit) return hit

  const cum = [0]
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = (pts[i][0] - pts[i - 1][0]) * Math.cos((pts[i][1] * Math.PI) / 180)
    const dy = pts[i][1] - pts[i - 1][1]
    total += Math.sqrt(dx * dx + dy * dy)
    cum.push(total)
  }

  const value = { cum, total }
  lengthCache.set(pts, value)
  return value
}

/** Точка на маршруте по доле пройденного расстояния 0..1, с интерполяцией. */
function pointAt(pts: [number, number][], t: number): [number, number] {
  const clamped = Math.min(1, Math.max(0, t))
  const { cum, total } = cumulative(pts)
  if (total === 0) return pts[0]

  const target = clamped * total
  let i = 1
  while (i < cum.length - 1 && cum[i] < target) i++

  const segStart = cum[i - 1]
  const segLen = cum[i] - segStart
  const f = segLen > 0 ? (target - segStart) / segLen : 0

  const a = pts[i - 1]
  const b = pts[i]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
}

/** Пройденная часть маршрута до доли t, с точной конечной точкой. */
function sliceTo(pts: [number, number][], t: number): [number, number][] {
  const clamped = Math.min(1, Math.max(0, t))
  const { cum, total } = cumulative(pts)
  if (total === 0) return [pts[0]]

  const target = clamped * total
  let i = 1
  while (i < cum.length - 1 && cum[i] < target) i++

  return [...pts.slice(0, i), pointAt(pts, clamped)]
}

export type SimTrip = {
  id: number
  label: string
  fromId: number
  toId: number
  /** Час выезда по времени Актау, 0..24. */
  departHour: number
  /** Сколько часов занимает рейс с учётом гружёного грузовика. */
  durationHours: number
}

export type FleetMapProps = {
  trips: SimTrip[]
  /** Симулированное время суток в часах, 0..24. */
  simHour: number
  /** Маршрут выбранной заявки — синим, камера уводится в него. */
  focusRoute?: [number, number][] | null
  /** Маршрут обратной загрузки — зелёным. */
  backhaulRoute?: [number, number][] | null
  /** id выбранного рейса: на карте остаётся только он, остальные скрыты. */
  soloTripId?: number | null
}

export function FleetMap({ trips, simHour, focusRoute, backhaulRoute, soloTripId = null }: FleetMapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [ready, setReady] = React.useState(false)

  const mapRef = React.useRef<MapInstance | null>(null)
  const mapglRef = React.useRef<MapGL | null>(null)
  const baseRef = React.useRef<Destroyable[]>([])
  const lanesRef = React.useRef<Destroyable[]>([])
  const truckRef = React.useRef<Map<number, { marker: MarkerInst; line: Destroyable | null; ticks: number }>>(new Map())
  const focusRef = React.useRef<Destroyable[]>([])

  // ── Инициализация: карта, посёлки, фоновые нитки маршрутов ──
  React.useEffect(() => {
    if (!containerRef.current) return

    let dead = false

    Promise.all([resolveMapKey(), load()]).then(([mapKey, mapgl]) => {
      if (dead || !containerRef.current) return
      if (!mapKey) {
        setError(MAP_KEY_MISSING)
        return
      }
      mapglRef.current = mapgl

      const map = new mapgl.Map(containerRef.current, {
        center: CENTER,
        zoom: ZOOM,
        key: mapKey,
        style: "e05ac437-fcc2-4845-ad74-b1de9ce07555",
      })
      mapRef.current = map
      setReady(true)

      // Населённые пункты: размер кружка по населению, отдалённые янтарём
      for (const s of SETTLEMENTS) {
        const pop = s.population ?? 800
        const r = Math.max(7, Math.min(17, Math.round(Math.sqrt(pop) / 22) + 6))
        baseRef.current.push(
          new mapgl.Marker(map, {
            coordinates: [s.lng, s.lat],
            icon: townIcon(r, s.is_remote),
            size: [r * 2, r * 2],
            anchor: [r, r],
            zIndex: 3,
          }) as unknown as Destroyable,
          new mapgl.Label(map, {
            coordinates: [s.lng, s.lat],
            text: s.name,
            fontSize: 11,
            color: "#cbd5e1",
            haloRadius: 3,
            haloColor: "#0f172a",
            offset: [0, r + 8],
size: [0, 0],
          } as never) as unknown as Destroyable,
        )
      }

    }).catch((err) => {
      if (!dead) {
        console.error("2GIS map:", err)
        setError(mapLoadError(err))
      }
    })
    return () => {
      dead = true
      baseRef.current.forEach((o) => o.destroy())
      baseRef.current = []
      lanesRef.current.forEach((o) => o.destroy())
      lanesRef.current = []
      truckRef.current.forEach(({ marker, line }) => {
        marker.destroy()
        line?.destroy()
      })
      truckRef.current.clear()
      mapRef.current?.destroy()
      mapRef.current = null
    }
    // trips меняются редко и целиком — пересоздание карты тут допустимо
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Движение машин по симулированному времени ──
  React.useEffect(() => {
    const map = mapRef.current
    const mapgl = mapglRef.current
    if (!map || !mapgl) return

    for (const trip of trips) {
      const road = roadBetween(trip.fromId, trip.toId)
      if (!road || road.length < 2) continue

      const progress = (simHour - trip.departHour) / trip.durationHours
      const existing = truckRef.current.get(trip.id)

      // Соло-режим: выбран рейс или открыта заявка — на карте остаётся
      // одна машина, иначе десяток линий читать невозможно
      const solo = soloTripId != null || Boolean(focusRoute)
      const hidden = solo && trip.id !== soloTripId

      // Рейс ещё не начался, уже завершён или скрыт — машины на карте нет
      if (hidden || progress < 0 || progress > 1) {
        if (existing) {
          existing.marker.destroy()
          existing.line?.destroy()
          truckRef.current.delete(trip.id)
        }
        continue
      }

      const pos = pointAt(road, progress)
      const passed = sliceTo(road, progress)

      if (existing) {
        // Маркер двигаем каждый тик — он лёгкий. Пройденный след
        // пересоздаём раз в 20 тиков: полилиния тяжелее, и на 34 рейсах
        // её постоянное пересоздание роняло плавность
        existing.marker.setCoordinates(pos)
        existing.ticks += 1
        if (existing.ticks % 20 === 0) {
          existing.line?.destroy()
          existing.line = new mapgl.Polyline(map, {
            coordinates: passed,
            width: 4,
            color: "#f59e0b",
            zIndex: 8,
          }) as unknown as Destroyable
        }
      } else {
        truckRef.current.set(trip.id, {
          marker: new mapgl.Marker(map, {
            coordinates: pos,
            icon: truckIcon("#f59e0b"),
            size: [34, 34],
            anchor: [17, 17],
            zIndex: 15,
          }),
          line: new mapgl.Polyline(map, {
            coordinates: passed,
            width: 4,
            color: "#f59e0b",
            zIndex: 8,
          }) as unknown as Destroyable,
          ticks: 0,
        })
      }
    }
  }, [simHour, trips, soloTripId, focusRoute, ready])

  // ── Фоновые нитки плеч ──
  // Рисуются только когда ничего не выбрано. Гасить их прозрачностью нельзя:
  // у полилинии 2GIS нет setOpacity, поэтому линии просто пересоздаются.
  React.useEffect(() => {
    const map = mapRef.current
    const mapgl = mapglRef.current
    if (!map || !mapgl) return

    lanesRef.current.forEach((o) => o.destroy())
    lanesRef.current = []

    if (soloTripId != null || focusRoute) return

    const drawn = new Set<string>()
    for (const trip of trips) {
      const key = `${trip.fromId}-${trip.toId}`
      if (drawn.has(key)) continue
      drawn.add(key)
      const road = roadBetween(trip.fromId, trip.toId)
      if (!road) continue
      lanesRef.current.push(
        new mapgl.Polyline(map, {
          coordinates: road,
          width: 2,
          color: "#475569",
        }) as unknown as Destroyable,
      )
    }
  }, [trips, soloTripId, focusRoute, ready])

  // ── Подсветка выбранной заявки и её обратной загрузки ──
  React.useEffect(() => {
    const map = mapRef.current
    const mapgl = mapglRef.current
    if (!map || !mapgl) return

    focusRef.current.forEach((o) => o.destroy())
    focusRef.current = []

    const lines: Destroyable[] = []

    if (focusRoute && focusRoute.length >= 2) {
      lines.push(
        new mapgl.Polyline(map, {
          coordinates: focusRoute,
          width: 11,
          color: "#ea580c",
          zIndex: 20,
        } as never) as unknown as Destroyable,
        new mapgl.Polyline(map, {
          coordinates: focusRoute,
          width: 4,
          color: "#fdba74",
          zIndex: 21,
        } as never) as unknown as Destroyable,
      )
    }

    if (backhaulRoute && backhaulRoute.length >= 2) {
      lines.push(
        new mapgl.Polyline(map, {
          coordinates: backhaulRoute,
          width: 4,
          color: "#10b981",
          zIndex: 22,
        } as never) as unknown as Destroyable,
      )
    }

    focusRef.current = lines

    // Уводим камеру в выбранный маршрут — на области в 165 тысяч км²
    // короткое плечо иначе теряется в масштабе
    if (focusRoute && focusRoute.length >= 2) {
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
      for (const [lng, lat] of focusRoute) {
        if (lng < minLng) minLng = lng
        if (lat < minLat) minLat = lat
        if (lng > maxLng) maxLng = lng
        if (lat > maxLat) maxLat = lat
      }
      const fit = (map as unknown as { fitBounds?: (b: unknown, o?: unknown) => void }).fitBounds
      try {
        fit?.call(
          map,
          { southWest: [minLng, minLat], northEast: [maxLng, maxLat] },
          { padding: { top: 70, right: 70, bottom: 70, left: 70 } },
        )
      } catch {}
    }
  }, [focusRoute, backhaulRoute, ready])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        {error}
      </div>
    )
  }

  return <div ref={containerRef} className="h-full w-full" />
}
