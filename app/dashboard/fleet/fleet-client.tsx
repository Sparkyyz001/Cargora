"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { IconTruck } from "@tabler/icons-react"
import { toast } from "sonner"

import type { Vehicle } from "@/lib/actions/vehicles"
import { seedDemoVehicles, updateVehicleStatus } from "@/lib/actions/vehicles"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATUS_VARIANT: Record<Vehicle["status"], "default" | "secondary" | "outline"> = {
  "В рейсе": "default",
  Свободна: "secondary",
  "На ТО": "outline",
}

function EmptyState({ onSeed }: { onSeed: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <p className="text-muted-foreground text-sm">Автопарк пуст.</p>
      <Button variant="outline" onClick={onSeed}>
        Загрузить демо-данные
      </Button>
    </div>
  )
}

export function FleetClient({ vehicles: initialVehicles }: { vehicles: Vehicle[] }) {
  const router = useRouter()
  const [vehicles, setVehicles] = React.useState<Vehicle[]>(initialVehicles)

  async function handleSeed() {
    const result = await seedDemoVehicles()
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Демо-машины добавлены!")
      router.refresh()
    }
  }

  async function handleStatusChange(id: number, status: Vehicle["status"]) {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)))
    const result = await updateVehicleStatus(id, status)
    if (result.error) toast.error(result.error)
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <EmptyState onSeed={handleSeed} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        {vehicles.map((v) => (
          <Card key={v.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <IconTruck className="size-5 text-primary" />
                  {v.vehicle_code}
                </CardTitle>
                <Badge variant={STATUS_VARIANT[v.status]}>{v.status}</Badge>
              </div>
              <CardDescription>
                {v.plate} • {v.driver}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="text-muted-foreground">Маршрут: {v.route ?? "—"}</div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Загрузка</span>
                  <span>{v.load_percent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${v.load_percent}%` }}
                  />
                </div>
              </div>
              <Select
                value={v.status}
                onValueChange={(val) => handleStatusChange(v.id, val as Vehicle["status"])}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="В рейсе">В рейсе</SelectItem>
                  <SelectItem value="Свободна">Свободна</SelectItem>
                  <SelectItem value="На ТО">На ТО</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
