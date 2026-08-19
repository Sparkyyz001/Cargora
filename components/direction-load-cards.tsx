import { IconTrendingDown, IconTrendingUp, IconTruck, IconTruckLoading } from "@tabler/icons-react"

import { getDirectionLoad } from "@/lib/direction-load"
import { KpiTile, TileGrid, type TileAccent } from "@/components/kpi-tile"

// Серверный компонент: пересчитывается на каждый запрос — данные «живут».
// Показывает, где по области сейчас не хватает машин под заявки.

function accentFor(deficit: number, loadPct: number): TileAccent {
  if (deficit >= 4) return "rose"
  if (deficit >= 1) return "amber"
  if (loadPct >= 60) return "blue"
  return "green"
}

export function DirectionLoadCards() {
  const directions = getDirectionLoad()

  return (
    <div className="flex flex-col gap-3 px-4 lg:px-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold">Загруженность направлений</h2>
        <span className="text-xs text-muted-foreground">обновлено только что</span>
      </div>

      <TileGrid>
        {directions.map((d) => (
          <KpiTile
            key={d.id}
            span={3}
            accent={accentFor(d.deficit, d.loadPct)}
            title={d.name}
            value={d.pending}
            unit={d.pending === 1 ? "заявка" : d.pending < 5 ? "заявки" : "заявок"}
            icon={d.deficit > 0 ? <IconTruckLoading className="size-4" /> : <IconTruck className="size-4" />}
            hint={
              <span className="flex flex-wrap items-center gap-x-2">
                <span>{d.km} км</span>
                <span>·</span>
                <span>машин {d.vehicles}</span>
                <span>·</span>
                {d.deficit > 0 ? (
                  <span className="font-medium text-rose-600 dark:text-rose-400">
                    дефицит {d.deficit}
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">машин хватает</span>
                )}
                <span className="inline-flex items-center gap-0.5">
                  {d.trend === "up" ? (
                    <IconTrendingUp className="size-3.5" />
                  ) : (
                    <IconTrendingDown className="size-3.5" />
                  )}
                  {d.loadPct}%
                </span>
              </span>
            }
          />
        ))}
      </TileGrid>
    </div>
  )
}
