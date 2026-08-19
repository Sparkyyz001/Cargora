import type { Order } from "@/lib/actions/orders"

// Демо-подложка для дашборда: ~420 заявок за последние 90 дней по реальным
// направлениям внутри Мангистауской области. Заявки из базы складываются
// ПОВЕРХ этих цифр, поэтому дашборд всегда выглядит наполненным, а создание
// заявки сразу двигает метрики.
//
// Генерация детерминированная (seed), цифры не скачут между рендерами.
// Все направления — внутрирегиональные: ни порта, ни транзита, ни границы.

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Вес = относительная частота направления. Больше всего возят по оси
// Актау — Жанаозен и в ближние посёлки Мунайлинского района, реже —
// в отдалённые Бейнеу, Каламкас, Уштаган.
const ROUTES: { from: string; to: string; weight: number }[] = [
  { from: "Актау", to: "Жанаозен", weight: 22 },
  { from: "Актау", to: "Акшукур", weight: 14 },
  { from: "Актау", to: "Жетыбай", weight: 12 },
  { from: "Актау", to: "Курык", weight: 11 },
  { from: "Жанаозен", to: "Жетыбай", weight: 9 },
  { from: "Актау", to: "Шетпе", weight: 8 },
  { from: "Актау", to: "Мунайшы", weight: 6 },
  { from: "Актау", to: "Форт-Шевченко", weight: 5 },
  { from: "Жанаозен", to: "Сенек", weight: 4 },
  { from: "Актау", to: "Таушык", weight: 3 },
  { from: "Шетпе", to: "Бейнеу", weight: 3 },
  { from: "Актау", to: "Бейнеу", weight: 2 },
  { from: "Актау", to: "Уштаган", weight: 1 },
]

// Что реально возят внутри области: снабжение магазинов, стройки,
// вахтовые посёлки и промыслы.
const CARGO = [
  "Продукты питания",
  "Стройматериалы",
  "Питьевая вода",
  "Товары народного потребления",
  "Оборудование для промыслов",
  "Мебель и бытовая техника",
  "Комбикорм",
  "Инертные материалы",
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
  const rand = mulberry32(20260819)
  const orders: Order[] = []
  let id = -1

  const today = new Date()
  for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
    // 2–8 заявок в день, сегодня — гарантированно несколько
    const count = daysAgo === 0 ? 4 : 2 + Math.floor(rand() * 7)

    for (let k = 0; k < count; k++) {
      const d = new Date(today)
      d.setDate(d.getDate() - daysAgo)
      // Развоз идёт с раннего утра: пик 6:00–10:00, затем после обеда
      d.setHours(6 + Math.floor(rand() * 12), Math.floor(rand() * 60), 0, 0)

      const route = pickRoute(rand())

      // Старые заявки почти все доставлены, свежие — в работе
      let status: Order["status"]
      const r = rand()
      if (daysAgo > 10) status = r < 0.92 ? "Доставлен" : "В пути"
      else if (daysAgo > 3) status = r < 0.55 ? "Доставлен" : "В пути"
      else status = r < 0.2 ? "Доставлен" : r < 0.75 ? "В пути" : "Ожидает отправки"

      // Внутрирегиональные партии мельче транзитных: от 1.5 до 20 тонн
      orders.push({
        id: id--,
        order_number: `МАН-${String(90000 - orders.length).padStart(5, "0")}`,
        cargo_type: CARGO[Math.floor(rand() * CARGO.length)],
        status,
        weight: 1500 + Math.floor(rand() * 185) * 100,
        volume: 6 + Math.floor(rand() * 28),
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
