import { getRoutes } from "@/lib/actions/routes"
import { RoutesClient } from "./routes-client"

export default async function RoutesPage() {
  const routes = await getRoutes()
  return <RoutesClient routes={routes} />
}
