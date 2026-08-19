import { getOrders } from "@/lib/actions/orders"
import { getLandRoutes } from "@/lib/actions/land-routes"
import { LiveMap } from "@/components/live-map"

// Карта показывает перевозки внутри Мангистауской области.
// Прежний экран с вкладками «Суда Каспия · АИС» и «Паромы» убран: кейс
// хакатона прямо запрещает решения вокруг порта и международного транзита.

export default async function MapPage() {
  const [orders, landRoutes] = await Promise.all([getOrders(), getLandRoutes()])

  return <LiveMap orders={orders} landRoutes={landRoutes} mode="land" />
}
