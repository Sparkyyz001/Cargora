import { getOrders } from "@/lib/actions/orders"
import { DEMO_BASELINE } from "@/lib/demo-baseline"
import {
  computeDailySeries,
  computeOrderStats,
  computeTopRoutes,
} from "@/lib/order-stats"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function AnalyticsPage() {
  const orders = await getOrders()
  // Метрики = демо-подложка + реальные заказы (см. lib/demo-baseline.ts)
  const statsOrders = [...DEMO_BASELINE, ...orders]
  const stats = computeOrderStats(statsOrders)
  const dailySeries = computeDailySeries(statsOrders)
  const topRoutes = computeTopRoutes(statsOrders)

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards stats={stats} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive data={dailySeries} />
      </div>
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Топ маршрутов</CardTitle>
            <CardDescription>
              Самые загруженные направления по заказам вашей компании
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {topRoutes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Пока нет заказов с адресами — создайте заказ, и маршруты появятся здесь.
              </p>
            )}
            {topRoutes.map((r) => (
              <div key={r.route} className="flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{r.route}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {r.orders}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${r.share}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
