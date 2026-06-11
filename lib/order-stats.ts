import type { Order } from "@/lib/actions/orders"
import type { DashboardStats } from "@/components/section-cards"

const IN_TRANSIT = new Set(["В пути", "Жолда"])
const DELIVERED = new Set(["Доставлен", "Жеткізілді"])

export function computeOrderStats(orders: Order[]): DashboardStats {
  const total = orders.length
  const inTransit = orders.filter((o) => IN_TRANSIT.has(o.status)).length
  const delivered = orders.filter((o) => DELIVERED.has(o.status)).length

  const todayKey = new Date().toISOString().slice(0, 10)
  const createdToday = orders.filter((o) =>
    (o.created_at ?? "").startsWith(todayKey)
  ).length

  const totalKg = orders.reduce((sum, o) => sum + (Number(o.weight) || 0), 0)

  return {
    total,
    active: total - delivered,
    inTransit,
    delivered,
    createdToday,
    totalWeightTons: Math.round(totalKg / 1000),
  }
}

export type DailyPoint = {
  date: string
  delivered: number
  inWork: number
}

// Дневная динамика заказов за последние `days` дней (пустые дни = нули,
// чтобы фильтры 7/30/90 на графике всегда имели полную ось)
export function computeDailySeries(orders: Order[], days = 90): DailyPoint[] {
  const byDay = new Map<string, { delivered: number; inWork: number }>()

  for (const o of orders) {
    const key = (o.created_at ?? "").slice(0, 10)
    if (!key) continue
    const bucket = byDay.get(key) ?? { delivered: 0, inWork: 0 }
    if (DELIVERED.has(o.status)) bucket.delivered += 1
    else bucket.inWork += 1
    byDay.set(key, bucket)
  }

  const series: DailyPoint[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const bucket = byDay.get(key)
    series.push({
      date: key,
      delivered: bucket?.delivered ?? 0,
      inWork: bucket?.inWork ?? 0,
    })
  }
  return series
}

export type TopRoute = {
  route: string
  orders: number
  share: number
}

export type CargoTypeStat = {
  type: string
  orders: number
  tons: number
  share: number
}

// Разбивка транзита по типам грузов (для регионального дашборда)
export function computeCargoTypes(orders: Order[], limit = 7): CargoTypeStat[] {
  const byType = new Map<string, { orders: number; kg: number }>()

  for (const o of orders) {
    const key = o.cargo_type || "Прочее"
    const bucket = byType.get(key) ?? { orders: 0, kg: 0 }
    bucket.orders += 1
    bucket.kg += Number(o.weight) || 0
    byType.set(key, bucket)
  }

  const sorted = [...byType.entries()].sort((a, b) => b[1].orders - a[1].orders).slice(0, limit)
  const max = sorted[0]?.[1].orders ?? 0

  return sorted.map(([type, b]) => ({
    type,
    orders: b.orders,
    tons: Math.round(b.kg / 1000),
    share: max === 0 ? 0 : Math.round((b.orders / max) * 100),
  }))
}

function city(address: string | null) {
  if (!address) return null
  const first = address.split(",")[0].trim()
  return first.length > 0 ? first : null
}

// Топ-5 маршрутов по реальным заказам: «город отправителя → город получателя»
export function computeTopRoutes(orders: Order[], limit = 5): TopRoute[] {
  const counts = new Map<string, number>()

  for (const o of orders) {
    const from = city(o.sender_address)
    const to = city(o.recipient_address)
    if (!from || !to) continue
    const route = `${from} → ${to}`
    counts.set(route, (counts.get(route) ?? 0) + 1)
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
  const max = sorted[0]?.[1] ?? 0

  return sorted.map(([route, n]) => ({
    route,
    orders: n,
    share: max === 0 ? 0 : Math.round((n / max) * 100),
  }))
}
