"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { IconArrowRight, IconMapPin } from "@tabler/icons-react"
import { toast } from "sonner"

import type { Route } from "@/lib/actions/routes"
import { deleteRoute, seedDemoRoutes } from "@/lib/actions/routes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function EmptyState({ onSeed }: { onSeed: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <p className="text-muted-foreground text-sm">Маршрутов пока нет.</p>
      <Button variant="outline" onClick={onSeed}>
        Загрузить демо-данные
      </Button>
    </div>
  )
}

export function RoutesClient({ routes: initialRoutes }: { routes: Route[] }) {
  const router = useRouter()
  const [routes, setRoutes] = React.useState<Route[]>(initialRoutes)

  async function handleSeed() {
    const result = await seedDemoRoutes()
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Демо-маршруты добавлены!")
      router.refresh()
    }
  }

  async function handleDelete(id: number) {
    setRoutes((prev) => prev.filter((r) => r.id !== id))
    const result = await deleteRoute(id)
    if (result.error) {
      toast.error(result.error)
      router.refresh()
    } else {
      toast.success("Маршрут удалён")
    }
  }

  if (routes.length === 0) {
    return (
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <EmptyState onSeed={handleSeed} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      {routes.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <IconMapPin className="size-4 text-primary" />
                {r.from_city}
                <IconArrowRight className="size-4 text-muted-foreground" />
                {r.to_city}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === "В пути" ? "default" : "secondary"}>
                  {r.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                  onClick={() => handleDelete(r.id)}
                >
                  ✕
                </Button>
              </div>
            </div>
            <CardDescription>
              {r.route_code} • Перевозчик: {r.driver} • Прибытие через {r.eta}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${r.progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
