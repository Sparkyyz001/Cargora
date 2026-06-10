import { getOrders } from "@/lib/actions/orders"
import { getLandRoutes } from "@/lib/actions/land-routes"
import { MapTabs } from "@/components/map-tabs"

export default async function MapPage() {
  const [orders, landRoutes] = await Promise.all([
    getOrders(),
    getLandRoutes(),
  ])
  return <MapTabs orders={orders} landRoutes={landRoutes} />
}
