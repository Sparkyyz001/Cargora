"use client"

import * as React from "react"
import L from "leaflet"

import "leaflet/dist/leaflet.css"

// Запасная карта для машин без WebGL.
//
// 2ГИС рисует карту видеокартой, и если браузер не даёт видеоконтекст
// (выключено аппаратное ускорение, удалённый рабочий стол, старый драйвер),
// показать нечего. Leaflet рисует обычным холстом и работает везде,
// поэтому на таких машинах демо не превращается в пустой прямоугольник:
// те же посёлки, те же маршруты, те же машины, которые едут.
//
// Включается сама и только в этом случае — рабочую карту не трогает.

export type MapPoint = {
  lat: number
  lng: number
  label?: string
  color: string
  /** Радиус кружка в пикселях. */
  radius?: number
  /** Поверх остальных — для машин. */
  top?: boolean
}

export type MapLine = {
  /** Точки маршрута в порядке следования. */
  points: { lat: number; lng: number }[]
  color: string
  width?: number
  dashed?: boolean
}

export function MapFallback({
  center,
  zoom,
  points,
  lines,
  note = "Упрощённая карта: браузер не даёт WebGL",
}: {
  center: { lat: number; lng: number }
  zoom: number
  points: MapPoint[]
  lines?: MapLine[]
  note?: string
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<L.Map | null>(null)
  const layerRef = React.useRef<L.LayerGroup | null>(null)

  // ── Карта создаётся один раз ──
  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: true,
      attributionControl: true,
    })

    // Тёмная подложка CARTO: со светлыми плитками OSM интерфейс выглядит
    // так, будто в него вклеили чужой кусок.
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
      attribution: "© OpenStreetMap, © CARTO",
    }).addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
    // Центр и масштаб — начальные: дальше картой управляет пользователь.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Точки и линии перерисовываются на каждый тик симуляции ──
  React.useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    layer.clearLayers()

    for (const line of lines ?? []) {
      if (line.points.length < 2) continue
      L.polyline(
        line.points.map((p) => [p.lat, p.lng] as [number, number]),
        {
          color: line.color,
          weight: line.width ?? 3,
          opacity: 0.9,
          dashArray: line.dashed ? "6 6" : undefined,
        },
      ).addTo(layer)
    }

    for (const p of points) {
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: p.radius ?? 6,
        color: "#ffffff",
        weight: p.top ? 2 : 1.5,
        fillColor: p.color,
        fillOpacity: 0.95,
        pane: p.top ? "markerPane" : "overlayPane",
      }).addTo(layer)

      if (p.label) {
        marker.bindTooltip(p.label, {
          permanent: false,
          direction: "top",
          className: "text-xs",
        })
      }
    }
  }, [points, lines])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute right-2 top-2 z-[400] rounded-md bg-background/85 px-2 py-1 text-[11px] text-muted-foreground">
        {note}
      </div>
    </div>
  )
}
