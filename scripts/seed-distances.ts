// Одноразовый скрипт: считает матрицу расстояний между всеми НП области
// по реальному дорожному графу OSM и складывает её в public.distance_matrix.
//
//   node scripts/seed-distances.ts
//
// Запускается ОДИН РАЗ локально. Во время демо приложение берёт расстояния
// только из БД — никаких обращений к OSRM в рантайме быть не должно
// (публичный OSRM держит 1 запрос в секунду и на сцене отвалится).
//
// Почему http, а не https: публичный демо-сервер OSRM отдаёт TLS-хендшейк,
// который Windows schannel отвергает (SEC_E_ILLEGAL_MESSAGE). По http
// тот же эндпоинт отвечает нормально.

import { readFileSync, writeFileSync } from "node:fs"
import { SETTLEMENTS } from "../lib/mangystau.ts"

const OSRM_BASE = "http://router.project-osrm.org/route/v1/driving"
const USER_AGENT = "Cargora-Mangystau/1.0 (hackathon MVP; contact iroma6707@gmail.com)"
const RATE_LIMIT_MS = 1100

/** Коэффициент извилистости: во сколько раз дорога длиннее прямой.
 *  Используется только когда OSRM недоступен; такие строки помечаются
 *  approximate = true, чтобы приблизительные значения были видны. */
const DETOUR_FACTOR = 1.35

/** Промежуточный артефакт: собранная матрица до записи в БД. */
const CACHE_FILE = "scripts/distance-matrix.json"

type Row = { id: number; name: string; lat: number; lng: number }

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {}
  // split по /\r?\n/, а не по "\n": файл с CRLF оставил бы \r в конце строки,
  // а в JS точка не матчит \r — регулярка ниже не сработала бы ни разу
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
// Секретный ключ обходит RLS — справочники остаются закрытыми на запись
// для всех остальных. Ключ живёт только в .env.local (он в .gitignore)
// и читается только этим скриптом, который в рантайм приложения не попадает.
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SECRET_KEY = env.SUPABASE_SECRET_KEY
if (!SUPABASE_URL) throw new Error("Нет NEXT_PUBLIC_SUPABASE_URL в .env.local")
if (!ANON_KEY) throw new Error("Нет NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local")

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function rest(path: string, init: RequestInit = {}, key: string = ANON_KEY) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${path}: ${await res.text()}`)
  return res
}

/** Расстояние по большому кругу, км. */
function haversineKm(a: Row, b: Row): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

type Leg = { km: number; minutes: number; geometry: unknown; approximate: boolean }

async function osrmLeg(a: Row, b: Row): Promise<Leg> {
  const url = `${OSRM_BASE}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=simplified&geometries=geojson`
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(25_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as {
      code: string
      routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[]
    }
    const route = json.routes?.[0]
    if (json.code !== "Ok" || !route) throw new Error(`OSRM code=${json.code}`)
    return {
      km: Math.round((route.distance / 1000) * 100) / 100,
      minutes: Math.round(route.duration / 60),
      geometry: route.geometry.coordinates,
      approximate: false,
    }
  } catch (err) {
    // Фолбэк: прямая × коэффициент извилистости, скорость 70 км/ч
    const km = Math.round(haversineKm(a, b) * DETOUR_FACTOR * 100) / 100
    console.warn(`  ⚠ ${a.name} → ${b.name}: OSRM недоступен (${(err as Error).message}), фолбэк ${km} км`)
    return { km, minutes: Math.round((km / 70) * 60), geometry: null, approximate: true }
  }
}

async function main() {
  // 1. Справочник НП уже залит миграцией — просто читаем id.
  //    Чтение открыто политикой "settlements: all read", ключ не нужен.
  const rows: Row[] = await (await rest("settlements?select=id,name,lat,lng&order=id")).json()
  rows.forEach((r) => {
    r.lat = Number(r.lat)
    r.lng = Number(r.lng)
  })
  console.log(`Прочитано ${rows.length} НП → ${rows.length * (rows.length - 1)} упорядоченных пар`)

  // 2. Считаем матрицу. OSRM симметричен по расстоянию для driving,
  //    но время может отличаться — поэтому считаем каждое направление отдельно
  //    только один раз, а обратное берём из того же ответа (экономит половину
  //    запросов: 105 вместо 210, ~2 минуты вместо 4).
  const batch: Record<string, unknown>[] = []
  let done = 0
  let approx = 0

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i]
      const b = rows[j]
      const leg = await osrmLeg(a, b)
      if (leg.approximate) approx++

      const reversed = Array.isArray(leg.geometry)
        ? [...(leg.geometry as [number, number][])].reverse()
        : null

      batch.push(
        { from_id: a.id, to_id: b.id, km: leg.km, minutes: leg.minutes, geometry: leg.geometry, approximate: leg.approximate },
        { from_id: b.id, to_id: a.id, km: leg.km, minutes: leg.minutes, geometry: reversed, approximate: leg.approximate },
      )

      done++
      console.log(`[${done}/105] ${a.name} → ${b.name}: ${leg.km} км, ${leg.minutes} мин`)
      await sleep(RATE_LIMIT_MS)
    }
  }

  // 3. Сначала кладём результат на диск. Сбор данных из OSRM занимает
  //    две минуты и ограничен рейт-лимитом — потерять его из-за отвалившейся
  //    записи в БД нельзя. Файл в .gitignore, это промежуточный артефакт.
  writeFileSync(CACHE_FILE, JSON.stringify(batch), "utf8")
  console.log(`\nСохранено в ${CACHE_FILE} (${(JSON.stringify(batch).length / 1024).toFixed(0)} КБ)`)

  // 4. Пишем в БД пачками — один запрос на 10 строк.
  //    Падение записи не роняет скрипт: данные уже лежат на диске,
  //    залить их можно потом через scripts/push-distances.ts.
  try {
    if (!SECRET_KEY) throw new Error("нет SUPABASE_SECRET_KEY от этого проекта")
    console.log(`Записываю ${batch.length} строк в distance_matrix…`)
    for (let i = 0; i < batch.length; i += 10) {
      await rest("distance_matrix?on_conflict=from_id,to_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(batch.slice(i, i + 10)),
      }, SECRET_KEY)
    }
    console.log("Записано.")
  } catch (err) {
    console.error(`
✗ Запись в БД не прошла: ${(err as Error).message}`)
    console.error(`  Данные сохранены в ${CACHE_FILE}. Залей их: node scripts/push-distances.ts`)
  }

  // 5. Сверка с эталонами из ТЗ (раздел 3.2)
  const byName = new Map(rows.map((r) => [r.name, r.id]))
  const checks: [string, string, number][] = [
    ["Актау", "Жанаозен", 149.5],
    ["Актау", "Бейнеу", 469.5],
    ["Актау", "Курык", 71.0],
    ["Актау", "Форт-Шевченко", 144.6],
    ["Форт-Шевченко", "Баутино", 4.0],
  ]

  console.log("\nСверка с эталонными расстояниями:")
  for (const [from, to, expected] of checks) {
    const pair = batch.find((r) => r.from_id === byName.get(from) && r.to_id === byName.get(to))
    if (!pair) {
      console.log(`  ✗ ${from} → ${to}: пары нет в матрице`)
      continue
    }
    const km = pair.km as number
    const diff = Math.abs(km - expected) / expected
    const mark = diff <= 0.05 ? "✓" : "✗"
    console.log(`  ${mark} ${from} → ${to}: ${km} км (эталон ${expected}, расхождение ${(diff * 100).toFixed(1)}%)`)
  }

  console.log(`\nГотово. Пар: ${batch.length}, приблизительных (фолбэк): ${approx * 2}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
