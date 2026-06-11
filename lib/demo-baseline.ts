import type { Order } from "@/lib/actions/orders"

// Демо-подложка для дашборда: ~420 заказов за последние 90 дней.
// Реальные заказы из базы складываются ПОВЕРХ этих цифр, поэтому дашборд
// всегда выглядит наполненным, а создание заказа сразу двигает метрики.
// Генерация детерминированная (seed), цифры не скачут между рендерами.

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ROUTES: { from: string; to: string; weight: number }[] = [
  { from: "Порт Актау", to: "Туркменбаши", weight: 30 },
  { from: "Порт Актау", to: "Баку, порт Алят", weight: 23 },
  { from: "Бейнеу", to: "Болашак КПП", weight: 19 },
  { from: "Актау", to: "Алматы", weight: 14 },
  { from: "Жанаозен", to: "Атырау", weight: 9 },
  { from: "Актау", to: "Амирабад, Иран", weight: 5 },
]

const CARGO = [
  "Нефтепродукты",
  "Контейнер ТМТМ",
  "Металлопрокат",
  "Зерновые грузы",
  "Строительные материалы",
  "Химические грузы",
  "Автомобили",
]

const DRIVERS = ["Ахмет С.", "Батыр Ж.", "Нурлан Б.", "Арман Т.", "Серик К.", "Дауит М."]

function pickRoute(r: number) {
  const total = ROUTES.reduce((s, x) => s + x.weight, 0)
  let acc = 0
  const target = r * total
  for (const route of ROUTES) {
    acc += route.weight
    if (target < acc) return route
  }
  return ROUTES[0]
}

function buildBaseline(): Order[] {
  const rand = mulberry32(20260611)
  const orders: Order[] = []
  let id = -1

  const today = new Date()
  for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
    // 2–8 заказов в день, сегодня — гарантированно несколько
    const count = daysAgo === 0 ? 4 : 2 + Math.floor(rand() * 7)

    for (let k = 0; k < count; k++) {
      const d = new Date(today)
      d.setDate(d.getDate() - daysAgo)
      d.setHours(6 + Math.floor(rand() * 14), Math.floor(rand() * 60), 0, 0)

      const route = pickRoute(rand())

      // Старые заказы почти все доставлены, свежие — в работе
      let status: Order["status"]
      const r = rand()
      if (daysAgo > 10) status = r < 0.92 ? "Доставлен" : "В пути"
      else if (daysAgo > 3) status = r < 0.55 ? "Доставлен" : "В пути"
      else status = r < 0.2 ? "Доставлен" : r < 0.75 ? "В пути" : "Ожидает отправки"

      orders.push({
        id: id--,
        order_number: `МАН-${String(90000 - orders.length).padStart(5, "0")}`,
        cargo_type: CARGO[Math.floor(rand() * CARGO.length)],
        status,
        weight: 7000 + Math.floor(rand() * 250) * 100,
        volume: 10 + Math.floor(rand() * 35),
        driver: DRIVERS[Math.floor(rand() * DRIVERS.length)],
        delivery_date: null,
        sender_name: null,
        sender_phone: null,
        sender_address: route.from,
        recipient_name: null,
        recipient_phone: null,
        recipient_address: route.to,
        created_at: d.toISOString(),
      })
    }
  }
  return orders
}

export const DEMO_BASELINE: Order[] = buildBaseline()
