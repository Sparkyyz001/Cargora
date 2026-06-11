"use client"

import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { useLang } from "@/lib/use-lang"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type DashboardStats = {
  active: number
  inTransit: number
  delivered: number
  totalWeightTons: number
  createdToday: number
  total: number
}

function pct(part: number, total: number) {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}

export function SectionCards({ stats }: { stats: DashboardStats }) {
  const { t } = useLang()

  const inTransitPct = pct(stats.inTransit, stats.total)
  const deliveredPct = pct(stats.delivered, stats.total)

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{t.cards.activeOrders}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.active.toLocaleString("ru-RU")}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              +{stats.createdToday}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {t.cards.monthGrowth} <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">{t.cards.activeDesc}</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{t.cards.inTransit}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.inTransit.toLocaleString("ru-RU")}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {inTransitPct >= 50 ? <IconTrendingUp /> : <IconTrendingDown />}
              {inTransitPct}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {t.cards.lessPause}
          </div>
          <div className="text-muted-foreground">{t.cards.transitDesc}</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{t.cards.onTime}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.delivered.toLocaleString("ru-RU")}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {deliveredPct}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {t.cards.slaAbove} <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">{t.cards.onTimeDesc}</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{t.cards.revenue}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalWeightTons.toLocaleString("ru-RU")} т
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {stats.total.toLocaleString("ru-RU")}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {t.cards.stableGrowth} <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">{t.cards.revenueDesc}</div>
        </CardFooter>
      </Card>
    </div>
  )
}
