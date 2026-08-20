// Получение ключа 2GIS на клиенте.
//
// Сначала смотрим в бандл (переменная вшита сборкой), и только если её там
// нет — спрашиваем сервер. Ответ кэшируется на время жизни вкладки: карт на
// странице бывает несколько, дёргать маршрут на каждую незачем.

const INLINED = process.env.NEXT_PUBLIC_2GIS_API_KEY

let pending: Promise<string | null> | null = null

export const MAP_KEY_MISSING =
  "Карта не загрузилась: не задан ключ 2GIS. Добавьте NEXT_PUBLIC_2GIS_API_KEY " +
  "в переменные окружения (локально — .env.local, на Vercel — Settings → " +
  "Environment Variables) и пересоберите приложение."

export function resolveMapKey(): Promise<string | null> {
  if (INLINED) return Promise.resolve(INLINED)
  if (pending) return pending

  pending = fetch("/api/map-key", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : { key: null }))
    .then((data: { key?: string | null }) => data.key ?? null)
    .catch(() => null)

  return pending
}
