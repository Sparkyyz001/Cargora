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

export const WEBGL_UNAVAILABLE =
  "Карта 2ГИС рисуется через WebGL, а браузер его не даёт. Чаще всего выключено " +
  "аппаратное ускорение: Chrome → Настройки → Система → «Использовать аппаратное " +
  "ускорение (при наличии)», затем перезапустить браузер. Если ускорение включено, " +
  "помогает обновление драйвера видеокарты; в удалённом рабочем столе WebGL часто " +
  "недоступен вовсе."

/**
 * Есть ли у браузера WebGL.
 *
 * Проверяем сами и заранее: без этого 2ГИС падает уже внутри отрисовки,
 * и по её сообщению не понять, что чинить надо не ключ и не сеть.
 */
export function hasWebGL(): boolean {
  if (typeof document === "undefined") return false
  try {
    const canvas = document.createElement("canvas")
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl")
    if (!gl) return false
    // Контекст занимает ресурс видеокарты — освобождаем сразу, иначе
    // проверка сама съедает один из полутора десятков доступных.
    const lose = (gl as WebGLRenderingContext).getExtension?.("WEBGL_lose_context")
    lose?.loseContext()
    return true
  } catch {
    return false
  }
}

/** Причина падения карты человеческим языком — вместе с тем, что сказал 2ГИС. */
export function mapLoadError(cause: unknown): string {
  const detail =
    cause instanceof Error ? cause.message : typeof cause === "string" ? cause : ""
  return (
    "Не удалось загрузить карту 2ГИС" +
    (detail ? `: ${detail}` : "") +
    ". Проверьте подключение и не блокирует ли браузер mapgl.2gis.com."
  )
}

export function resolveMapKey(): Promise<string | null> {
  if (INLINED) return Promise.resolve(INLINED)
  if (pending) return pending

  pending = fetch("/api/map-key", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : { key: null }))
    .then((data: { key?: string | null }) => data.key ?? null)
    .catch(() => null)

  return pending
}
