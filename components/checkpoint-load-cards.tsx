import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { getCheckpointLoad } from "@/lib/checkpoint-load"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function loadColor(pct: number) {
  if (pct >= 80) return "text-red-600 dark:text-red-400"
  if (pct >= 60) return "text-amber-600 dark:text-amber-400"
  return "text-green-600 dark:text-green-400"
}

// Серверный компонент: пересчитывается на каждый запрос — данные «живут»
export function CheckpointLoadCards() {
  const points = getCheckpointLoad()

  return (
    <div className="flex flex-col gap-3 px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-green-500" />
        </span>
        <h2 className="text-sm font-medium">Пункты пропуска — загруженность сейчас</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {points.map((p) => (
          <Card key={p.id} className="@container/card gap-2 py-4">
            <CardHeader>
              <CardDescription>{p.name}</CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums">
                {p.queue} {p.unit}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className={loadColor(p.loadPct)}>
                  {p.trend === "up" ? <IconTrendingUp /> : <IconTrendingDown />}
                  {p.loadPct}%
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-0.5 text-sm">
              <div className="font-medium">Ожидание ~{p.waitHours} ч</div>
              <div className="text-muted-foreground">{p.kind}</div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
