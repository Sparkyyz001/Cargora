import { IconCoin, IconDroplet, IconRoad, IconTruckReturn } from "@tabler/icons-react"

import { createClient } from "@/lib/supabase/server"
import {
  BODY_TYPE_LABELS,
  DIESEL_PRICE_KZT,
  FUEL_CONSUMPTION,
  formatKzt,
  type BodyType,
} from "@/lib/economics"
import { KpiTile, TileGrid } from "@/components/kpi-tile"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Расход топлива по рейсам.
//
// Не абстрактный отчёт: литры считаются из фактического плеча по дорожному
// графу и нормы расхода для конкретного кузова, деньги — по цене дизеля
// на АЗС. Отсюда же видно, сколько топлива ушло бы в порожний возврат —
// это и есть цена отказа от обратной загрузки.

export const dynamic = "force-dynamic"

export default async function FuelPage() {
  const supabase = await createClient()

  const [ordersRes, matrixRes, settlementsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id,order_number,cargo_type,status,body_type,driver,from_settlement_id,to_settlement_id,distance_km,created_at")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("distance_matrix").select("from_id,to_id,km"),
    supabase.from("settlements").select("id,name"),
  ])

  const names = new Map((settlementsRes.data ?? []).map((s) => [s.id, s.name]))
  const kmByPair = new Map(
    (matrixRes.data ?? []).map((m) => [`${m.from_id}-${m.to_id}`, Number(m.km)]),
  )

  type Row = {
    id: number
    number: string
    cargo: string
    driver: string
    bodyType: BodyType
    fromName: string
    toName: string
    km: number
    liters: number
    kzt: number
    returnLiters: number
    returnKzt: number
    status: string
  }

  const rows: Row[] = []

  for (const o of ordersRes.data ?? []) {
    if (o.from_settlement_id == null || o.to_settlement_id == null) continue

    const km =
      Number(o.distance_km ?? 0) ||
      kmByPair.get(`${o.from_settlement_id}-${o.to_settlement_id}`) ||
      0
    if (km === 0) continue

    const bodyType = (o.body_type ?? "tent") as BodyType
    const perKm = FUEL_CONSUMPTION[bodyType] / 100

    const liters = km * perKm
    // Обратное плечо: во что обошёлся бы порожний возврат
    const returnKm = kmByPair.get(`${o.to_settlement_id}-${o.from_settlement_id}`) ?? km
    const returnLiters = returnKm * perKm

    rows.push({
      id: o.id,
      number: o.order_number,
      cargo: o.cargo_type,
      driver: o.driver ?? "—",
      bodyType,
      fromName: names.get(o.from_settlement_id) ?? "—",
      toName: names.get(o.to_settlement_id) ?? "—",
      km,
      liters,
      kzt: liters * DIESEL_PRICE_KZT,
      returnLiters,
      returnKzt: returnLiters * DIESEL_PRICE_KZT,
      status: o.status,
    })
  }

  const totalKm = rows.reduce((s, r) => s + r.km, 0)
  const totalLiters = rows.reduce((s, r) => s + r.liters, 0)
  const totalKzt = rows.reduce((s, r) => s + r.kzt, 0)
  const emptyRiskKzt = rows.reduce((s, r) => s + r.returnKzt, 0)

  // Расход по типам кузова
  const byBody = new Map<BodyType, { liters: number; km: number; trips: number }>()
  for (const r of rows) {
    const cur = byBody.get(r.bodyType) ?? { liters: 0, km: 0, trips: 0 }
    cur.liters += r.liters
    cur.km += r.km
    cur.trips += 1
    byBody.set(r.bodyType, cur)
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-bold">Расход топлива</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Литры считаются из фактического плеча по дорожному графу и нормы расхода кузова
        </p>
      </div>

      <TileGrid>
        <KpiTile span={3} accent="blue" title="Пробег с грузом"
          value={Math.round(totalKm).toLocaleString("ru-RU")} unit="км"
          icon={<IconRoad className="size-4" />} hint={`${rows.length} рейсов`} />
        <KpiTile span={3} accent="amber" title="Дизеля израсходовано"
          value={Math.round(totalLiters).toLocaleString("ru-RU")} unit="л"
          icon={<IconDroplet className="size-4" />} hint={`по ${DIESEL_PRICE_KZT} ₸ за литр`} />
        <KpiTile span={3} accent="slate" title="Затраты на топливо"
          value={formatKzt(totalKzt)}
          icon={<IconCoin className="size-4" />} hint="только гружёное плечо" />
        <KpiTile span={3} accent="rose" title="Цена порожних возвратов"
          value={formatKzt(emptyRiskKzt)}
          icon={<IconTruckReturn className="size-4" />}
          hint="столько сгорит, если возвращаться пустыми" />
      </TileGrid>

      {/* ── По типам кузова ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Расход по типам кузова</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...byBody.entries()]
            .sort((a, b) => b[1].liters - a[1].liters)
            .map(([body, v]) => (
              <div key={body} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{BODY_TYPE_LABELS[body]}</span>
                  <Badge variant="secondary" className="text-[10px] tabular-nums">
                    {FUEL_CONSUMPTION[body]} л/100 км
                  </Badge>
                </div>
                <div className="mt-2 text-2xl font-bold tabular-nums">
                  {Math.round(v.liters).toLocaleString("ru-RU")}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">л</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  {v.trips} рейсов · {Math.round(v.km).toLocaleString("ru-RU")} км
                </div>
              </div>
            ))}
          {byBody.size === 0 && (
            <p className="text-sm text-muted-foreground">
              Данных пока нет — расход появится после первых рейсов.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── По рейсам ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">По рейсам</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Заявка</th>
                  <th className="px-4 py-2 text-left font-medium">Маршрут</th>
                  <th className="px-4 py-2 text-left font-medium">Водитель</th>
                  <th className="px-4 py-2 text-left font-medium">Кузов</th>
                  <th className="px-4 py-2 text-right font-medium">Плечо</th>
                  <th className="px-4 py-2 text-right font-medium">Литров</th>
                  <th className="px-4 py-2 text-right font-medium">Топливо</th>
                  <th className="px-4 py-2 text-right font-medium">Порожний возврат</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{r.number}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {r.fromName} → {r.toName}
                    </td>
                    <td className="px-4 py-2">{r.driver}</td>
                    <td className="px-4 py-2 text-muted-foreground">{BODY_TYPE_LABELS[r.bodyType]}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{Math.round(r.km)} км</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.liters.toFixed(1)}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {formatKzt(r.kzt)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-rose-600 dark:text-rose-400">
                      {formatKzt(r.returnKzt)}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Рейсов с указанными населёнными пунктами пока нет.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="px-4 pt-3 text-xs text-muted-foreground">
            Нормы расхода: тент 30, рефрижератор 33, самосвал 35, борт 30, манипулятор 32 л/100 км —
            по нормативам КамАЗ. Цена дизеля {DIESEL_PRICE_KZT} ₸/л, мониторинг АЗС РК.
            Колонка «порожний возврат» — во что обошлось бы возвращаться пустым, то есть цена
            отказа от обратной загрузки.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
