import { IconArrowNarrowRight, IconCoin, IconDroplet, IconRoute, IconTruckReturn } from "@tabler/icons-react"

import { createClient } from "@/lib/supabase/server"
import {
  BASELINE_EMPTY_RUN_SHARE,
  DIESEL_PRICE_KZT,
  FUEL_CONSUMPTION,
  MATCHING_REDUCTION,
  formatKzt,
  type BodyType,
} from "@/lib/economics"
import { buildMatrix, matchBackhaul, type DistanceRow, type OrderRow, type SettlementRow } from "@/lib/matching"
import { KpiTile, TileGrid } from "@/components/kpi-tile"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Оптимизатор маршрутов — направление 3 из кейса.
//
// Тут видно то, ради чего платформа существует: какие связки система нашла
// в текущем пуле заявок, сколько порожних километров они снимают и во что
// это превращается в тенге. Матчинг работает в бирже, а эта страница —
// его витрина: без неё вклад оптимизатора не виден.

export const dynamic = "force-dynamic"

const FREE_STATUSES = ["Ожидает отправки", "Жіберілуді күтуде"]

export default async function OptimizationPage() {
  const supabase = await createClient()

  const [settlementsRes, matrixRes, ordersRes, allOrdersRes] = await Promise.all([
    supabase.from("settlements").select("id,name,lat,lng"),
    supabase.from("distance_matrix").select("from_id,to_id,km,minutes"),
    supabase
      .from("orders")
      .select("id,order_number,cargo_type,status,weight,body_type,carrier_id,from_settlement_id,to_settlement_id,pickup_from")
      .in("status", FREE_STATUSES)
      .is("carrier_id", null)
      .limit(200),
    supabase.from("orders").select("id,distance_km,empty_km_saved,tenge_saved,matched_backhaul_id"),
  ])

  const settlements = (settlementsRes.data ?? []) as SettlementRow[]
  const matrix = buildMatrix((matrixRes.data ?? []) as DistanceRow[], settlements)
  const names = new Map(settlements.map((s) => [s.id, s.name]))
  const pool = (ordersRes.data ?? []) as OrderRow[]

  // Прогоняем матчинг по всему пулу свободных заявок: для каждой ищем
  // встречный груз. Это ровно то, что увидит перевозчик, открыв заявку.
  const pairs: {
    outbound: OrderRow
    backhaulNumber: string
    backhaulCargo: string
    fromName: string
    toName: string
    emptyKmWithout: number
    emptyKmWith: number
    kztSaved: number
    fuelLitersSaved: number
  }[] = []

  const used = new Set<number>()

  for (const order of pool) {
    if (used.has(order.id)) continue
    if (order.from_settlement_id == null || order.to_settlement_id == null) continue

    const { best } = matchBackhaul(
      {
        fromSettlementId: order.from_settlement_id,
        toSettlementId: order.to_settlement_id,
        weightKg: order.weight ?? 1000,
        bodyType: (order.body_type ?? "tent") as BodyType,
        pickupFrom: order.pickup_from ?? new Date().toISOString(),
        pickupTo: new Date(Date.now() + 86_400_000).toISOString(),
        excludeOrderId: order.id,
      },
      pool.filter((o) => !used.has(o.id)),
      matrix,
      names,
      20_000,
    )

    if (!best) continue

    used.add(order.id)
    used.add(best.orderId)

    pairs.push({
      outbound: order,
      backhaulNumber: best.orderNumber,
      backhaulCargo: best.cargoType,
      fromName: best.fromName,
      toName: best.toName,
      emptyKmWithout: best.saving.emptyKmWithout,
      emptyKmWith: best.saving.emptyKmWith,
      kztSaved: best.saving.kztSaved,
      fuelLitersSaved: best.saving.fuelLitersSaved,
    })
  }

  pairs.sort((a, b) => b.kztSaved - a.kztSaved)

  const totalEmptyKmSaved = pairs.reduce((s, p) => s + (p.emptyKmWithout - p.emptyKmWith), 0)
  const totalKztSaved = pairs.reduce((s, p) => s + p.kztSaved, 0)
  const totalLiters = pairs.reduce((s, p) => s + p.fuelLitersSaved, 0)

  // Накопленное по уже взятым связкам
  const historic = (allOrdersRes.data ?? []).reduce(
    (acc, o) => {
      acc.km += Number(o.empty_km_saved ?? 0)
      acc.kzt += Number(o.tenge_saved ?? 0)
      return acc
    },
    { km: 0, kzt: 0 },
  )

  // Сколько порожняка в этом пуле осталось незакрытым
  const unmatched = pool.filter((o) => !used.has(o.id))

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-bold">Оптимизация порожнего пробега</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Система ищет встречный груз для каждой заявки и показывает, во что это обходится в тенге
        </p>
      </div>

      <TileGrid>
        <KpiTile
          span={3}
          accent="green"
          title="Связок найдено"
          value={pairs.length}
          unit={pairs.length === 1 ? "пара" : "пар"}
          icon={<IconTruckReturn className="size-4" />}
          hint={`из ${pool.length} свободных заявок`}
        />
        <KpiTile
          span={3}
          accent="amber"
          title="Порожних км снято"
          value={Math.round(totalEmptyKmSaved).toLocaleString("ru-RU")}
          unit="км"
          icon={<IconRoute className="size-4" />}
          hint="если взять все найденные связки"
        />
        <KpiTile
          span={3}
          accent="blue"
          title="Топлива сэкономлено"
          value={Math.round(totalLiters).toLocaleString("ru-RU")}
          unit="л"
          icon={<IconDroplet className="size-4" />}
          hint={`по ${DIESEL_PRICE_KZT} ₸ за литр`}
        />
        <KpiTile
          span={3}
          accent="green"
          title="Экономия перевозчикам"
          value={formatKzt(totalKztSaved)}
          icon={<IconCoin className="size-4" />}
          hint={
            historic.kzt > 0
              ? `плюс ${formatKzt(historic.kzt)} уже реализовано`
              : "топливо и время водителей"
          }
        />
      </TileGrid>

      {/* ── Найденные связки ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Найденные связки</CardTitle>
        </CardHeader>
        <CardContent>
          {pairs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              В текущем пуле встречных грузов не нашлось. Связка требует, чтобы обратный груз
              забирался не дальше 60 км от точки разгрузки и возвращал машину в радиус 80 км
              от начала — иначе подача съедает всю выгоду.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {pairs.map((p) => (
                <div
                  key={p.outbound.id}
                  className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.04] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      {/* Прямой рейс */}
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {p.outbound.order_number}
                        </Badge>
                        <span className="font-medium">{p.outbound.cargo_type}</span>
                        <span className="text-muted-foreground">
                          {names.get(p.outbound.from_settlement_id ?? -1)}
                        </span>
                        <IconArrowNarrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {names.get(p.outbound.to_settlement_id ?? -1)}
                        </span>
                      </div>

                      {/* Обратный груз */}
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 font-mono text-[10px] text-emerald-600 dark:text-emerald-400"
                        >
                          {p.backhaulNumber}
                        </Badge>
                        <span className="font-medium">{p.backhaulCargo}</span>
                        <span className="text-muted-foreground">{p.fromName}</span>
                        <IconArrowNarrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground">{p.toName}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatKzt(p.kztSaved)}
                      </div>
                      <div className="text-xs tabular-nums text-muted-foreground">
                        порожняк {Math.round(p.emptyKmWithout)} → {Math.round(p.emptyKmWith)} км
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Что осталось без пары ── */}
      {unmatched.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Без обратной загрузки</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              По этим заявкам встречного груза сейчас нет — машина вернётся порожней. Это и есть
              резерв, который закрывается ростом числа заявок на платформе.
            </p>
            <div className="flex flex-wrap gap-2">
              {unmatched.slice(0, 14).map((o) => (
                <Badge key={o.id} variant="secondary" className="font-normal">
                  {names.get(o.from_settlement_id ?? -1)} → {names.get(o.to_settlement_id ?? -1)}
                </Badge>
              ))}
              {unmatched.length > 14 && (
                <Badge variant="secondary" className="font-normal">
                  ещё {unmatched.length - 14}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Как считается ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Как считается экономия</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Без связки перевозчик едет A → B с грузом и возвращается B → A порожняком. Со связкой
            вместо порожнего возврата он делает короткую подачу B → C и берёт груз C → D.
            Экономится разница порожних пробегов — топливо плюс время водителя.
          </p>
          <p>
            Расход тента 20 т — {FUEL_CONSUMPTION.tent} л/100 км, дизель {DIESEL_PRICE_KZT} ₸/л.
            Базовая доля порожнего пробега {(BASELINE_EMPTY_RUN_SHARE * 100).toFixed(1)}% — Eurostat
            2024 по внутренним перевозкам ЕС; документированное снижение при автоматическом
            матчинге {(MATCHING_REDUCTION * 100).toFixed(0)}% — Convoy −19%, Uber Freight −22.6%.
            По Казахстану собственных исследований порожнего пробега не существует.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
