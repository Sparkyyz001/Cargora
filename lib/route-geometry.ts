// Геометрия дорог между всеми населёнными пунктами области.
//
// 210 пар, 5086 точек, посчитано один раз по дорожному графу OpenStreetMap
// через OSRM (scripts/seed-distances.ts) и уложено в бандл. Благодаря этому
// маршрут рисуется мгновенно и без единого сетевого запроса — публичный OSRM
// держит 1 запрос в секунду и на демо отвалился бы.
//
// Координаты в формате [lng, lat] — так их отдаёт GeoJSON и так их ждёт
// 2GIS MapGL. Округлены до 5 знаков, это около метра на местности.

import geometry from "./route-geometry.json" with { type: "json" }

const GEOMETRY = geometry as unknown as Record<string, [number, number][]>

/**
 * Точки дороги между двумя НП. Возвращает null, если пары нет —
 * вызывающий код тогда рисует прямую и это видно как упрощение.
 */
export function roadBetween(
  fromSettlementId: number | null | undefined,
  toSettlementId: number | null | undefined,
): [number, number][] | null {
  if (fromSettlementId == null || toSettlementId == null) return null
  return GEOMETRY[`${fromSettlementId}-${toSettlementId}`] ?? null
}

/** Прямоугольник, охватывающий маршрут: [[minLng, minLat], [maxLng, maxLat]]. */
export function boundsOf(coords: [number, number][]): [[number, number], [number, number]] {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng
    if (lat < minLat) minLat = lat
    if (lng > maxLng) maxLng = lng
    if (lat > maxLat) maxLat = lat
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}
