import { getVehicles } from "@/lib/actions/vehicles"
import { FleetClient } from "./fleet-client"

export default async function FleetPage() {
  const vehicles = await getVehicles()
  return <FleetClient vehicles={vehicles} />
}
