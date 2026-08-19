import { IconAlertTriangle, IconMapPin, IconPackage, IconUsers } from "@tabler/icons-react"

import { createClient } from "@/lib/supabase/server"
import { SETTLEMENTS } from "@/lib/mangystau"
import { KpiTile, TileGrid } from "@/components/kpi-tile"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Логистика отдалённых посёлков — направление 4 из кейса.
//
// Отвечает на вопрос, который у акимата действительно есть: куда завозят
// регулярно, а куда не доезжают. Отдалённый посёлок без доставок — это
// не строчка в таблице, а люди без товаров первой необходимости.

export const dynamic = "force-dynamic"

/** Сколько суток без доставки считаем разрывом снабжения. */
const GAP_DAYS = 7

export default async function SettlementsPage() {
  const supabase = await createClient()

  const [settlementsRes, ordersRes, matrixRes] = await Promise.all([
    supabase.from("settlements").select("id,name,name_kz,district,population,is_remote").order("id"),
    supabase.from("orders").select("id,to_settlement_id,cargo_type,status,created_at,weight"),
    supabase.from("distance_matrix").select("to_id,km").eq("from_id", 1),
  ])

  const settlements = settlementsRes.data ?? []
  const orders = ordersRes.data ?? []
  const kmFromAktau = new Map((matrixRes.data ?? []).map((m) => [m.to_id, Number(m.km)]))

  // Сводка по каждому пункту: сколько заявок, когда последняя, что везли
  type Row = {
    id: number
    name: string
    nameKz: string
    district: string
    population: number | null
    isRemote: boolean
    km: number
    deliveries: number
    lastAt: string | null
    tons: number
    cargo: string[]
  }

  const rows: Row[] = settlements.map((s) => {
    const own = orders.filter((o) => o.to_settlement_id === s.id)
    const last = own
      .map((o) => o.created_at as string)
      .sort()
      .at(-1)

    const kz = SETTLEMENTS.find((x) => x.name === s.name)?.name_kz ?? ""

    return {
      id: s.id,
      name: s.name,
      nameKz: kz,
      district: s.district ?? "—",
      population: s.population,
      isRemote: Boolean(s.is_remote),
      km: kmFromAktau.get(s.id) ?? 0,
      deliveries: own.length,
      lastAt: last ?? null,
      tons: own.reduce((sum, o) => sum + Number(o.weight ?? 0), 0) / 1000,
      cargo: [...new Set(own.map((o) => o.cargo_type as string))].slice(0, 3),
    }
  })

  const remote = rows.filter((r) => r.isRemote)
  const now = Date.now()

  const daysSince = (iso: string | null) =>
    iso == null ? null : Math.floor((now - new Date(iso).getTime()) / 86_400_000)

  const withGap = remote.filter((r) => {
    const d = daysSince(r.lastAt)
    return d === null || d > GAP_DAYS
  })

  const remotePopulation = remote.reduce((s, r) => s + (r.population ?? 0), 0)
  const totalRemoteDeliveries = remote.reduce((s, r) => s + r.deliveries, 0)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-bold">Снабжение отдалённых посёлков</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Куда завозят регулярно, а куда не доезжают — по всем населённым пунктам области
        </p>
      </div>

      <TileGrid>
        <KpiTile
          span={3}
          accent="blue"
          title="Населённых пунктов"
          value={rows.length}
          icon={<IconMapPin className="size-4" />}
          hint={`из них отдалённых — ${remote.length}`}
        />
        <KpiTile
          span={3}
          accent="slate"
          title="Людей в отдалённых"
          value={remotePopulation.toLocaleString("ru-RU")}
          icon={<IconUsers className="size-4" />}
          hint="оценка, данные OSM отстают"
        />
        <KpiTile
          span={3}
          accent="green"
          title="Доставок в отдалённые"
          value={totalRemoteDeliveries}
          icon={<IconPackage className="size-4" />}
          hint="за всё время на платформе"
        />
        <KpiTile
          span={3}
          accent={withGap.length > 0 ? "rose" : "green"}
          title="Разрывов снабжения"
          value={withGap.length}
          icon={<IconAlertTriangle className="size-4" />}
          hint={`нет доставок дольше ${GAP_DAYS} суток`}
        />
      </TileGrid>

      {/* ── Разрывы снабжения ── */}
      {withGap.length > 0 && (
        <Card className="border-rose-500/30 bg-rose-500/[0.03]">
          <CardHeader>
            <CardTitle className="text-base">Требуют внимания</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              В эти пункты давно не было доставок. Для акимата это прямой сигнал: либо туда никто
              не берётся ехать из-за плеча и состояния дороги, либо снабжение идёт мимо платформы.
            </p>
            <div className="flex flex-col gap-2">
              {withGap.map((r) => {
                const d = daysSince(r.lastAt)
                return (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background/70 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.name}</span>
                        {r.nameKz && r.nameKz !== r.name && (
                          <span className="text-xs text-muted-foreground">{r.nameKz}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.district} · {Math.round(r.km)} км от Актау
                        {r.population ? ` · ~${r.population.toLocaleString("ru-RU")} чел.` : ""}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-rose-500/40 text-rose-600 dark:text-rose-400"
                    >
                      {d === null ? "доставок не было" : `${d} суток назад`}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Все пункты ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Все населённые пункты</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Пункт</th>
                  <th className="px-4 py-2 text-left font-medium">Район</th>
                  <th className="px-4 py-2 text-right font-medium">Население</th>
                  <th className="px-4 py-2 text-right font-medium">От Актау</th>
                  <th className="px-4 py-2 text-right font-medium">Доставок</th>
                  <th className="px-4 py-2 text-right font-medium">Тонн</th>
                  <th className="px-4 py-2 text-left font-medium">Что везли</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            r.isRemote ? "bg-amber-500" : "bg-slate-500",
                          )}
                        />
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r.district}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {r.population ? r.population.toLocaleString("ru-RU") : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {r.km > 0 ? `${Math.round(r.km)} км` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {r.deliveries || "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {r.tons > 0 ? r.tons.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {r.cargo.length > 0 ? r.cargo.join(", ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="px-4 pt-3 text-xs text-muted-foreground">
            Янтарной точкой отмечены отдалённые пункты. Население — оценка OpenStreetMap, по
            большинству сёл она отстаёт на 10–50%, поэтому используется как порядок величины,
            а не как точная цифра. Расстояния — по дорожному графу OSM.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
