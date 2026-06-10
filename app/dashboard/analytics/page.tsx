import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const topRoutes = [
  { route: "Порт Актау → Туркменбаши (паром)", orders: 412, share: 100 },
  { route: "Порт Актау → Баку, порт Алят (паром)", orders: 318, share: 77 },
  { route: "Бейнеу → Болашак КПП (авто)", orders: 256, share: 62 },
  { route: "Актау → Алматы (авто/ж/д)", orders: 184, share: 45 },
  { route: "Жанаозен → Актау → Атырау", orders: 127, share: 31 },
]

export default function AnalyticsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Топ маршрутов Мангистау</CardTitle>
            <CardDescription>Транзитные отправки через порт Актау, КПП Бейнеу и Болашак — июнь 2026</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
