import {
  IconAlertTriangle,
  IconCoin,
  IconRoute,
  IconTruckDelivery,
} from "@tabler/icons-react"

import { createClient } from "@/lib/supabase/server"
import { formatKzt } from "@/lib/economics"
import { DEMO_BASELINE } from "@/lib/demo-baseline"
import { KpiTile, TileGrid } from "@/components/kpi-tile"
import { ScaleCalculator } from "@/components/scale-calculator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Дашборд для акимата: картина грузопотоков внутри области.
// Отвечает на вопрос, который у акимата действительно есть, — куда идут
// грузы, где не хватает машин и в какие посёлки вообще ничего не возят.

export const dynamic = "force-dynamic"

type FlowRow = { from: string; to: string; count: number; km: number }

export default async function AkimatPage() {
  const supabase = await createClient()

  const [settlementsRes, ordersRes, matrixRes] = await Promise.all([
    supabase.from("settlements").select("id,name,population,is_remote,district"),
    supabase
      .from("orders")
      .select("id,from_settlement_id,to_settlement_id,empty_km_saved,tenge_saved,created_at,status"),
    supabase.from("distance_matrix").select("from_id,to_id,km"),
  ])

  const settlements = settlementsRes.data ?? []
  const orders = ordersRes.data ?? []
  const matrix = matrixRes.data ?? []

  const nameById = new Map(settlements.map((s) => [s.id, s.name]))
  const kmByPair = new Map(matrix.map((m) => [`${m.from_id}-${m.to_id}`, Number(m.km)]))

  // ── Накопленная экономия платформы ──
  const emptyKmSaved = orders.reduce((sum, o) => sum + Number(o.empty_km_saved ?? 0), 0)
  const tengeSaved = orders.reduce((sum, o) => sum + Number(o.tenge_saved ?? 0), 0)

  // ── Грузопотоки: сколько заявок прошло по каждому направлению ──
  const flows = new Map<string, FlowRow>()
  for (const o of orders) {
    if (o.from_settlement_id == null || o.to_settlement_id == null) continue
    const key = `${o.from_settlement_id}-${o.to_settlement_id}`
    const existing = flows.get(key)
    if (existing) {
      existing.count++
    } else {
      flows.set(key, {
        from: nameById.get(o.from_settlement_id) ?? "—",
        to: nameById.get(o.to_settlement_id) ?? "—",
        count: 1,
        km: kmByPair.get(key) ?? 0,
      })
    }
  }

  // Подложка держит картину наполненной, пока заявок в базе мало —
  // направления берутся из тех же реальных плеч области
  const baselineFlows = new Map<string, FlowRow>()
  for (const o of DEMO_BASELINE) {
    const from = o.sender_address ?? ""
    const to = o.recipient_address ?? ""
    if (!from || !to) continue
    const key = `${from}→${to}`
    const existing = baselineFlows.get(key)
    if (existing) existing.count++
    else baselineFlows.set(key, { from, to, count: 1, km: 0 })
  }

  const topFlows = [...(flows.size > 0 ? flows.values() : []), ...baselineFlows.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const maxFlow = topFlows[0]?.count ?? 1

  // ── Отдалённые посёлки без доставок ──
  const touched = new Set<number>()
  for (const o of orders) {
    if (o.to_settlement_id != null) touched.add(o.to_settlement_id)
  }
  const untouchedRemote = settlements.filter((s) => s.is_remote && !touched.has(s.id))

  const totalDeliveries = orders.length + DEMO_BASELINE.length

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Грузопотоки Мангистауской области</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Картина перевозок внутри региона для планирования дорог и снабжения
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/dashboard/akimat/report">Выгрузить отчёт</Link>
        </Button>
      </div>

      {/* ── Показатели ── */}
      <TileGrid>
        <KpiTile
          span={3}
          accent="blue"
          title="Заявок на платформе"
          value={totalDeliveries.toLocaleString("ru-RU")}
          icon={<IconTruckDelivery className="size-4" />}
          hint="за последние 90 дней"
        />
        <KpiTile
          span={3}
          accent="amber"
          title="Порожних км убрано"
          value={Math.round(emptyKmSaved).toLocaleString("ru-RU")}
          unit="км"
          icon={<IconRoute className="size-4" />}
          hint="накоплено связками обратной загрузки"
        />
        <KpiTile
          span={3}
          accent="green"
          title="Сэкономлено перевозчикам"
          value={formatKzt(tengeSaved)}
          icon={<IconCoin className="size-4" />}
          hint="топливо и время водителей"
        />
        <KpiTile
          span={3}
          accent={untouchedRemote.length > 0 ? "rose" : "green"}
          title="Посёлки без доставок"
          value={untouchedRemote.length}
          unit={untouchedRemote.length === 1 ? "посёлок" : "посёлков"}
          icon={<IconAlertTriangle className="size-4" />}
          hint="из отдалённых населённых пунктов"
        />
      </TileGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Топ направлений ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Направления по объёму</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {topFlows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Данных пока нет.</p>
            ) : (
              topFlows.map((f, i) => (
                <div key={`${f.from}-${f.to}-${i}`} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">
                      {f.from} → {f.to}
                      {f.km > 0 ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {Math.round(f.km)} км
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{f.count}</span>
                  </div>
                  {/* Толщина полосы пропорциональна числу заявок — это и есть
                      тепловая карта грузопотока в табличном виде */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-blue-500/70"
                      style={{ width: `${Math.max(4, (f.count / maxFlow) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* ── Отдалённые посёлки ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Отдалённые населённые пункты</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Куда за период не пришло ни одной заявки — это прямой сигнал о разрыве в снабжении.
            </p>
            <div className="flex flex-col gap-2">
              {settlements
                .filter((s) => s.is_remote)
                .map((s) => {
                  const has = touched.has(s.id)
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.district}
                          {s.population ? ` · ~${s.population.toLocaleString("ru-RU")} чел.` : ""}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          has
                            ? "shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            : "shrink-0 border-rose-500/30 text-rose-600 dark:text-rose-400"
                        }
                      >
                        {has ? "есть доставки" : "нет доставок"}
                      </Badge>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      <ScaleCalculator />
    </div>
  )
}
