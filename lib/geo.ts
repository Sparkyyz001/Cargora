export type LatLng = { lat: number; lng: number }

/** Координаты городов, встречающихся в заказах и автопарке (для демо-трекинга на карте). */
/** Координаты населённых пунктов Мангистауской области.
 *  Ключи — в нижнем регистре, есть казахские варианты названий: адрес
 *  может быть записан и «Жанаозен», и «Жаңаөзен». Источник координат —
 *  OpenStreetMap, они же лежат в public.settlements. */
const CITY_COORDS: Record<string, LatLng> = {
  "актау": { lat: 43.6353, lng: 51.1682 },
  "ақтау": { lat: 43.6353, lng: 51.1682 },
  "жанаозен": { lat: 43.3381, lng: 52.8556 },
  "жаңаөзен": { lat: 43.3381, lng: 52.8556 },
  "бейнеу": { lat: 45.3214, lng: 55.1862 },
  "шетпе": { lat: 44.1413, lng: 52.1556 },
  "жетыбай": { lat: 43.5884, lng: 52.1015 },
  "жетібай": { lat: 43.5884, lng: 52.1015 },
  "акшукур": { lat: 43.7832, lng: 51.0605 },
  "ақшұқыр": { lat: 43.7832, lng: 51.0605 },
  "курык": { lat: 43.1767, lng: 51.6797 },
  "құрық": { lat: 43.1767, lng: 51.6797 },
  "форт-шевченко": { lat: 44.5086, lng: 50.2619 },
  "мунайшы": { lat: 43.4985, lng: 52.0879 },
  "мұнайшы": { lat: 43.4985, lng: 52.0879 },
  "баутино": { lat: 44.5400, lng: 50.2500 },
  "таушык": { lat: 44.3465, lng: 51.3487 },
  "таушық": { lat: 44.3465, lng: 51.3487 },
  "сенек": { lat: 43.3648, lng: 53.3882 },
  "уштаган": { lat: 43.8253, lng: 52.7234 },
  "үштаған": { lat: 43.8253, lng: 52.7234 },
  "каламкас": { lat: 45.3521, lng: 51.9037 },
  "қаламқас": { lat: 45.3521, lng: 51.9037 },
  "тущыкудык": { lat: 44.7361, lng: 51.9651 },
  "тущықұдық": { lat: 44.7361, lng: 51.9651 },
}

const DEFAULT_COORDS: LatLng = CITY_COORDS["актау"]

/** Простой детерминированный хэш строки (FNV-подобный) — нужен для стабильного смещения точки. */
function hashString(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  return hash
}

/** На сколько градусов может "разъехаться" точка внутри населённого пункта.
 *  0.008° — примерно 800 м. Прежние 0.045° (~5 км) годились для миллионников,
 *  но в посёлке на 2 тысячи человек выкидывали точку в открытую степь. */
const ADDRESS_JITTER_DEGREES = 0.008

/**
 * Смещает координаты города в пределах района/улицы конкретного адреса.
 * Смещение детерминированное (зависит от полного текста адреса), поэтому один
 * и тот же адрес всегда попадает в одну и ту же точку, а разные адреса в одном
 * городе не накладываются друг на друга — на карте видно конкретный микрорайон/улицу.
 */
function jitterByAddress(coords: LatLng, address: string): LatLng {
  const hash = hashString(address.toLowerCase().trim())
  const dLat = (((hash & 0xffff) / 0xffff) * 2 - 1) * ADDRESS_JITTER_DEGREES
  const dLng = ((((hash >>> 16) & 0xffff) / 0xffff) * 2 - 1) * ADDRESS_JITTER_DEGREES
  return { lat: coords.lat + dLat, lng: coords.lng + dLng }
}

/** Ищет город в строке адреса и возвращает точные координаты (без смещения). */
export function findCityBase(text: string | null | undefined): LatLng | null {
  if (!text) return null
  const normalized = text.toLowerCase()
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(city)) return coords
  }
  return null
}

/** Ищет в строке адреса известный город и возвращает точку внутри него,
 *  смещённую под конкретный адрес (район/улицу/дом). */
export function findCityCoords(text: string | null | undefined): LatLng | null {
  if (!text) return null
  const normalized = text.toLowerCase()
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(city)) return jitterByAddress(coords, text)
  }
  return null
}

/** Возвращает координаты города из адреса, либо запасной вариант по умолчанию. */
export function resolveCoords(text: string | null | undefined, fallback: LatLng = DEFAULT_COORDS): LatLng {
  return findCityCoords(text) ?? fallback
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Линейная интерполяция между двумя точками; t от 0 (старт) до 1 (финиш). */
export function interpolateCoords(from: LatLng, to: LatLng, t: number): LatLng {
  const clamped = Math.min(1, Math.max(0, t))
  return { lat: lerp(from.lat, to.lat, clamped), lng: lerp(from.lng, to.lng, clamped) }
}

const FALLBACK_TRANSIT_DAYS = 3

type ProgressInput = {
  status: string
  created_at: string
  delivery_date: string | null
}

const DELIVERED_STATUSES = ["Доставлен", "Жеткізілді"]
const PENDING_STATUSES = ["Ожидает отправки", "Жіберілуді күтуде"]

/**
 * Симулирует прогресс перемещения груза (0..1) на основе времени создания заказа
 * и плановой даты доставки — реальной телеметрии нет, поэтому "живое" движение
 * по карте рассчитывается из временной шкалы заказа.
 */
export function computeOrderProgress({ status, created_at, delivery_date }: ProgressInput): number {
  if (PENDING_STATUSES.includes(status)) return 0
  if (DELIVERED_STATUSES.includes(status)) return 1

  const start = new Date(created_at).getTime()
  const end = delivery_date
    ? new Date(delivery_date).getTime()
    : start + FALLBACK_TRANSIT_DAYS * 24 * 60 * 60 * 1000

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0.5

  const t = (Date.now() - start) / (end - start)
  return Math.min(0.96, Math.max(0.04, t))
}
