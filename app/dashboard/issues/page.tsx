import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClock,
  IconTemperature,
  IconTool,
  IconWind,
  type Icon,
} from "@tabler/icons-react"

import { getIncidents, INCIDENT_LABEL, type IncidentKind } from "@/lib/incidents"
import { KpiTile, TileGrid } from "@/components/kpi-tile"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Инциденты на маршрутах: погода и дорога, из-за которых рейсы срываются.
// Это те же факторы, что заложены в ML-модель спроса, поэтому страница
// не украшение — она объясняет, почему в какие-то часы заявок меньше.

export const dynamic = "force-dynamic"

const ICONS: Record<IncidentKind, Icon> = {
  storm: IconWind,
  heat: IconTemperature,
  road: IconAlertTriangle,
  breakdown: IconTool,
  delay: IconClock,
}

const SEVERITY_STYLE = {
  high: "border-rose-500/35 bg-rose-500/[0.05]",
  medium: "border-amber-500/35 bg-amber-500/[0.05]",
  low: "border-border bg-muted/30",
} as const

const SEVERITY_BADGE = {
  high: "border-rose-500/40 text-rose-600 dark:text-rose-400",
  medium: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  low: "text-muted-foreground",
} as const

const SEVERITY_LABEL = { high: "высокая", medium: "средняя", low: "низкая" } as const

function agoLabel(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} мин назад`
  return `${hours.toFixed(1).replace(".0", "")} ч назад`
}

export default function IssuesPage() {
  const incidents = getIncidents()

  const open = incidents.filter((i) => !i.resolved)
  const high = open.filter((i) => i.severity === "high")
  const weather = incidents.filter((i) => i.kind === "storm" || i.kind === "heat")

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-bold">Инциденты на маршрутах</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Погода и состояние дорог — те же факторы, что учитывает модель прогноза спроса
        </p>
      </div>

      <TileGrid>
        <KpiTile span={3} accent={open.length > 0 ? "amber" : "green"} title="Открытых"
          value={open.length} icon={<IconAlertTriangle className="size-4" />}
          hint="требуют решения диспетчера" />
        <KpiTile span={3} accent={high.length > 0 ? "rose" : "green"} title="Высокой важности"
          value={high.length} icon={<IconAlertTriangle className="size-4" />}
          hint="рейс под угрозой срыва" />
        <KpiTile span={3} accent="blue" title="Погодных"
          value={weather.length} icon={<IconWind className="size-4" />}
          hint="буря и жара за сутки" />
        <KpiTile span={3} accent="green" title="Закрыто"
          value={incidents.length - open.length} icon={<IconCircleCheck className="size-4" />}
          hint="за последние сутки" />
      </TileGrid>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Лента за сутки</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          {incidents.map((inc) => {
            const Icon = ICONS[inc.kind]
            return (
              <div
                key={inc.id}
                className={cn(
                  "rounded-lg border p-3 transition-opacity",
                  SEVERITY_STYLE[inc.severity],
                  inc.resolved && "opacity-55",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-background/70">
                    <Icon className="size-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{inc.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {INCIDENT_LABEL[inc.kind]}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px]", SEVERITY_BADGE[inc.severity])}>
                        {SEVERITY_LABEL[inc.severity]}
                      </Badge>
                      {inc.resolved && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 text-[10px] text-emerald-600 dark:text-emerald-400"
                        >
                          закрыт
                        </Badge>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">{inc.detail}</p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/70">{inc.lane}</span>
                      <span>{agoLabel(inc.hoursAgo)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Пыльные бури и жара — не декорация: ветер выше 15 м/с снижает активность перевозок
        на 30–50%, температура выше 40 °C бьёт по скоропорту. Оба фактора заложены в симулятор
        и в обученную модель прогноза спроса, поэтому инциденты объясняют провалы на графике,
        а не просто соседствуют с ним.
      </p>
    </div>
  )
}
