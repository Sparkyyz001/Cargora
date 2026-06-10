export type LatLng = { lat: number; lng: number }

/** Координаты городов, встречающихся в заказах и автопарке (для демо-трекинга на карте). */
const CITY_COORDS: Record<string, LatLng> = {
  // Казахстан
  "алматы": { lat: 43.2389, lng: 76.8897 },
  "астана": { lat: 51.1605, lng: 71.4704 },
  "нур-султан": { lat: 51.1605, lng: 71.4704 },
  "шымкент": { lat: 42.3000, lng: 69.5901 },
  "караганда": { lat: 49.8047, lng: 73.1094 },
  "актобе": { lat: 50.2839, lng: 57.2094 },
  "павлодар": { lat: 52.2873, lng: 76.9674 },
  "атырау": { lat: 47.1164, lng: 51.8830 },
  "усть-каменогорск": { lat: 49.9714, lng: 82.6059 },
  "семей": { lat: 50.4111, lng: 80.2275 },
  "костанай": { lat: 53.2198, lng: 63.6354 },
  "тараз": { lat: 42.9000, lng: 71.3667 },
  "кызылорда": { lat: 44.8528, lng: 65.5092 },
  "уральск": { lat: 51.2333, lng: 51.3667 },
  "петропавловск": { lat: 54.8667, lng: 69.1500 },
  "актау": { lat: 43.6500, lng: 51.1972 },
  "талдыкорган": { lat: 45.0167, lng: 78.3667 },
  "талдықорған": { lat: 45.0167, lng: 78.3667 },
  "туркестан": { lat: 43.3000, lng: 68.2667 },
  "түркістан": { lat: 43.3000, lng: 68.2667 },
  "жезказган": { lat: 47.7833, lng: 67.7667 },
  "жезқазған": { lat: 47.7833, lng: 67.7667 },
  "экибастуз": { lat: 51.7264, lng: 75.3267 },
  "балхаш": { lat: 46.8431, lng: 75.0011 },
  "кокшетау": { lat: 53.2833, lng: 69.4000 },

  // Мангистау — порты, терминалы, КПП
  "жанаозен": { lat: 43.3400, lng: 52.8600 },
  "жаңаөзен": { lat: 43.3400, lng: 52.8600 },
  "бейнеу": { lat: 45.3143, lng: 55.0978 },
  "болашак": { lat: 41.7647, lng: 54.1050 },
  "форт-шевченко": { lat: 44.5250, lng: 50.2667 },
  "жетыбай": { lat: 43.5833, lng: 52.1167 },

  // Паромные маршруты — Каспийское море
  "туркменбаши": { lat: 40.0167, lng: 52.9833 },
  "туркменбашы": { lat: 40.0167, lng: 52.9833 },
  "баку": { lat: 40.4093, lng: 49.8671 },
  "алят": { lat: 40.0500, lng: 49.4167 },
  "нефтчала": { lat: 39.3833, lng: 49.2500 },
  "амирабад": { lat: 36.8667, lng: 53.4833 },
  "туркменабад": { lat: 39.0833, lng: 63.5667 },
  "туркменабат": { lat: 39.0833, lng: 63.5667 },
  "ашхабад": { lat: 37.9601, lng: 58.3261 },
  "ашгабат": { lat: 37.9601, lng: 58.3261 },

  // Россия
  "москва": { lat: 55.7558, lng: 37.6173 },
  "санкт-петербург": { lat: 59.9343, lng: 30.3351 },
  "спб": { lat: 59.9343, lng: 30.3351 },
  "казань": { lat: 55.7963, lng: 49.1088 },
  "тверь": { lat: 56.8587, lng: 35.9176 },
  "краснодар": { lat: 45.0355, lng: 38.9753 },
  "ростов": { lat: 47.2357, lng: 39.7015 },
  "новосибирск": { lat: 55.0084, lng: 82.9357 },
  "екатеринбург": { lat: 56.8389, lng: 60.6057 },
  "махачкала": { lat: 42.9849, lng: 47.5047 },
}

const DEFAULT_COORDS: LatLng = CITY_COORDS["алматы"]

/** Простой детерминированный хэш строки (FNV-подобный) — нужен для стабильного смещения точки. */
function hashString(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  return hash
}

/** На сколько градусов может "разъехаться" точка внутри города (~5 км). */
const ADDRESS_JITTER_DEGREES = 0.045

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
