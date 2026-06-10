"use client"

import * as React from "react"
import { load } from "@2gis/mapgl"

import { computeOrderProgress, findCityCoords, interpolateCoords } from "@/lib/geo"
import { cn } from "@/lib/utils"

const MAP_KEY = process.env.NEXT_PUBLIC_2GIS_API_KEY

type MapGLNamespace = Awaited<ReturnType<typeof load>>
type MapInstance = InstanceType<MapGLNamespace["Map"]>
type MarkerInstance = InstanceType<MapGLNamespace["Marker"]>

function pinIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40"><path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 25 15 25s15-13.75 15-25C30 6.716 23.284 0 15 0z" fill="${color}"/><circle cx="15" cy="15" r="6" fill="#ffffff"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function truckIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="${color}" stroke="#ffffff" stroke-width="3"/><path d="M9 14h11v8H9zM20 17h4l3 3v2h-7z" fill="#ffffff"/><circle cx="13" cy="24" r="2" fill="${color}"/><circle cx="26" cy="24" r="2" fill="${color}"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const PIN_SENDER = pinIcon("#16a34a")
const PIN_RECIPIENT = pinIcon("#ef4444")
const TRUCK = truckIcon("#7c3aed")

const IN_TRANSIT_STATUSES = ["В пути", "Жолда"]
const LIVE_TICK_MS = 5000

export type OrderTrackingMapProps = {
  senderAddress: string | null
  recipientAddress: string | null
  status: string
  createdAt: string
  deliveryDate: string | null
  className?: string
}

export function OrderTrackingMap({
  senderAddress,
  recipientAddress,
  status,
  createdAt,
  deliveryDate,
  className,
}: OrderTrackingMapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const vehicleRef = React.useRef<MarkerInstance | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const from = React.useMemo(() => findCityCoords(senderAddress), [senderAddress])
  const to = React.useMemo(() => findCityCoords(recipientAddress), [recipientAddress])

  React.useEffect(() => {
    if (!MAP_KEY) {
      setError("Карта недоступна: добавьте NEXT_PUBLIC_2GIS_API_KEY в .env.local (бесплатный ключ — на dev.2gis.com)")
      return
    }
    if (!from || !to) {
      setError("Не удалось определить города отправителя и получателя по адресам заказа")
      return
    }
    if (!containerRef.current) return

    setError(null)
    let destroyed = false
    let map: MapInstance | null = null

    load()
      .then((mapglAPI) => {
        if (destroyed || !containerRef.current) return

        map = new mapglAPI.Map(containerRef.current, {
          center: [(from.lng + to.lng) / 2, (from.lat + to.lat) / 2],
          zoom: 4.5,
          key: MAP_KEY,
        })

        new mapglAPI.Marker(map, {
          coordinates: [from.lng, from.lat],
          icon: PIN_SENDER,
          size: [30, 40],
          anchor: [15, 40],
        })
        new mapglAPI.Marker(map, {
          coordinates: [to.lng, to.lat],
          icon: PIN_RECIPIENT,
          size: [30, 40],
          anchor: [15, 40],
        })
        new mapglAPI.Polyline(map, {
          coordinates: [
            [from.lng, from.lat],
            [to.lng, to.lat],
          ],
          width: 3,
          color: "#7c3aed",
        })

        const progress = computeOrderProgress({ status, created_at: createdAt, delivery_date: deliveryDate })
        const start = interpolateCoords(from, to, progress)
        vehicleRef.current = new mapglAPI.Marker(map, {
          coordinates: [start.lng, start.lat],
          icon: TRUCK,
          size: [36, 36],
          anchor: [18, 18],
          zIndex: 10,
        })
      })
      .catch(() => {
        if (!destroyed) setError("Не удалось загрузить карту 2ГИС — проверьте ключ и подключение к интернету")
      })

    return () => {
      destroyed = true
      vehicleRef.current?.destroy()
      vehicleRef.current = null
      map?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from?.lat, from?.lng, to?.lat, to?.lng])

  // "Живое" перемещение: телеметрии нет, поэтому позиция машины считается
  // из временной шкалы заказа (created_at → delivery_date) и обновляется по таймеру.
  React.useEffect(() => {
    if (!from || !to) return

    const tick = () => {
      if (!vehicleRef.current) return
      const progress = computeOrderProgress({ status, created_at: createdAt, delivery_date: deliveryDate })
      const point = interpolateCoords(from, to, progress)
      vehicleRef.current.setCoordinates([point.lng, point.lat])
    }

    tick()
    if (!IN_TRANSIT_STATUSES.includes(status)) return

    const id = setInterval(tick, LIVE_TICK_MS)
    return () => clearInterval(id)
  }, [from, to, status, createdAt, deliveryDate])

  if (error) {
    return (
      <div
        className={cn(
          "flex aspect-video w-full items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground",
          className
        )}
      >
        {error}
      </div>
    )
  }

  return <div ref={containerRef} className={cn("aspect-video w-full overflow-hidden rounded-lg border", className)} />
}
