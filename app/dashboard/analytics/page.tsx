import { getOrders } from "@/lib/actions/orders"
import { DEMO_BASELINE } from "@/lib/demo-baseline"
import {
  computeCargoTypes,
  computeDailySeries,
  computeOrderStats,
  computeTopRoutes,
} from "@/lib/order-stats"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { CheckpointLoadCards } from "@/components/checkpoint-load-cards"
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
  const cargoTypes = computeCargoTypes(statsOrders)

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-xl font-semibold">Аналитика транзита Мангистауской области</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Сводный дашборд: объёмы, направления, типы грузов и загруженность
          пунктов пропуска — порт Актау, ТМТМ, граница с Туркменистаном
        </p>
      </div>
      <CheckpointLoadCards />
      <SectionCards stats={stats} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive data={dailySeries} />
      </div>
      <div className="grid grid-cols-1 gap-4 px-4 md:gap-6 lg:grid-cols-2 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Топ маршрутов</CardTitle>
            <CardDescription>
              Самые загруженные направления транзита через регион
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
        <Card>
          <CardHeader>
            <CardTitle>Структура грузов</CardTitle>
            <CardDescription>
              Типы грузов в транзите — количество отправок и тоннаж
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {cargoTypes.map((c) => (
              <div key={c.type} className="flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{c.type}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {c.orders} · {c.tons.toLocaleString("ru-RU")} т
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-chart-3"
                    style={{ width: `${c.share}%` }}
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
