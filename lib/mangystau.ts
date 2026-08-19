// Справочник населённых пунктов Мангистауской области.
//
// Координаты — OpenStreetMap, проверены 19.08.2026.
// Население — данные OSM/БНС; для большинства сёл отстают на 10–50%,
// поэтому используются только как порядок величины (размер маркера на карте,
// базовый уровень спроса в ML-симуляторе), но никогда как точная цифра в UI.
//
// Этот массив — источник правды для таблицы public.settlements.
// Заливается скриптом scripts/seed-distances.ts (шаг upsert перед матрицей).

export type Settlement = {
  name: string
  name_kz: string
  district: string
  lat: number
  lng: number
  /** null — постоянного населения нет либо оценки нет (вахтовые посёлки). */
  population: number | null
  /** Отдалённый пункт: плохая транспортная доступность, мало рейсов. */
  is_remote: boolean
}

export const SETTLEMENTS: readonly Settlement[] = [
  { name: "Актау",         name_kz: "Ақтау",         district: "Городская администрация", lat: 43.6353, lng: 51.1682, population: 303752, is_remote: false },
  { name: "Жанаозен",      name_kz: "Жаңаөзен",      district: "Городская администрация", lat: 43.3381, lng: 52.8556, population: 150000, is_remote: false },
  { name: "Бейнеу",        name_kz: "Бейнеу",        district: "Бейнеуский",              lat: 45.3214, lng: 55.1862, population:  58000, is_remote: true  },
  { name: "Шетпе",         name_kz: "Шетпе",         district: "Мангистауский",           lat: 44.1413, lng: 52.1556, population:  17100, is_remote: false },
  { name: "Жетыбай",       name_kz: "Жетібай",       district: "Каракиянский",            lat: 43.5884, lng: 52.1015, population:  13500, is_remote: false },
  { name: "Акшукур",       name_kz: "Ақшұқыр",       district: "Тупкараганский",          lat: 43.7832, lng: 51.0605, population:  12200, is_remote: false },
  { name: "Курык",         name_kz: "Құрық",         district: "Каракиянский",            lat: 43.1767, lng: 51.6797, population:  11600, is_remote: false },
  { name: "Форт-Шевченко", name_kz: "Форт-Шевченко", district: "Тупкараганский",          lat: 44.5086, lng: 50.2619, population:   8780, is_remote: true  },
  { name: "Мунайшы",       name_kz: "Мұнайшы",       district: "Каракиянский",            lat: 43.4985, lng: 52.0879, population:   5210, is_remote: false },
  { name: "Баутино",       name_kz: "Баутино",       district: "Тупкараганский",          lat: 44.5400, lng: 50.2500, population:   3900, is_remote: true  },
  { name: "Таушык",        name_kz: "Таушық",        district: "Тупкараганский",          lat: 44.3465, lng: 51.3487, population:   2770, is_remote: true  },
  { name: "Сенек",         name_kz: "Сенек",         district: "Каракиянский",            lat: 43.3648, lng: 53.3882, population:   1670, is_remote: true  },
  { name: "Уштаган",       name_kz: "Үштаған",       district: "Мангистауский",           lat: 43.8253, lng: 52.7234, population:   1330, is_remote: true  },
  { name: "Каламкас",      name_kz: "Қаламқас",      district: "Тупкараганский",          lat: 45.3521, lng: 51.9037, population:   null, is_remote: true  },
  { name: "Тущыкудык",     name_kz: "Тущықұдық",     district: "Мангистауский",           lat: 44.7361, lng: 51.9651, population:   null, is_remote: true  },
]

/** Районы области. Актау и Жанаозен — города областного значения. */
export const DISTRICTS = [
  "Бейнеуский",
  "Каракиянский",
  "Мангистауский",
  "Мунайлинский",
  "Тупкараганский",
] as const

/** Центр Мангистауской области — стартовая точка карты. */
export const REGION_CENTER = { lat: 44.0, lng: 52.5 }
export const REGION_ZOOM = 7

/** Площадь области, км². Источник: mangystau.invest.gov.kz */
export const REGION_AREA_KM2 = 165_642

const BY_NAME = new Map<string, Settlement>()
for (const s of SETTLEMENTS) {
  BY_NAME.set(s.name.toLowerCase(), s)
  BY_NAME.set(s.name_kz.toLowerCase(), s)
}

/** Ищет НП по русскому или казахскому названию (регистр не важен). */
export function findSettlement(name: string | null | undefined): Settlement | null {
  if (!name) return null
  return BY_NAME.get(name.toLowerCase().trim()) ?? null
}
