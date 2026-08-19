import Link from "next/link"
import {
  IconAlertTriangle,
  IconCoin,
  IconPackage,
  IconRoute,
  IconTruckDelivery,
  IconTruckReturn,
} from "@tabler/icons-react"

import { getOrders } from "@/lib/actions/orders"
import { DEMO_BASELINE } from "@/lib/demo-baseline"
import { computeDailySeries, computeOrderStats } from "@/lib/order-stats"
import { createClient } from "@/lib/supabase/server"
import { formatKzt } from "@/lib/economics"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DirectionLoadCards } from "@/components/direction-load-cards"
import { DataTable } from "@/components/data-table"
import { KpiTile, TileGrid } from "@/components/kpi-tile"
import { Button } from "@/components/ui/button"

// Обзор — ролевой экран. Один и тот же набор графиков для всех был
// бессмысленным: магазину не нужен дефицит машин по области, а акимату
// не нужны его собственные заявки. Каждая роль видит свой срез, и в
// заголовке прямо написано, чей это экран.

const ROLE_TITLE: Record<string, { title: string; subtitle: string }> = {
  sender: {
    title: "Обзор · Грузоотправитель",
    subtitle: "Ваши заявки, их статусы и расходы на перевозку",
  },
  carrier: {
    title: "Обзор · Перевозчик",
    subtitle: "Доступные заявки, ваши рейсы и заработок",
  },
  dispatcher: {
    title: "Обзор · Диспетчер",
    subtitle: "Картина перевозок по всей области",
  },
  driver: {
    title: "Обзор · Водитель",
    subtitle: "Ваши рейсы на сегодня",
  },
}

export default async function Page() {
  const supabase = await createClient()

  const [orders, { data: { user } }] = await Promise.all([getOrders(), supabase.auth.getUser()])

  let role = "sender"
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    role = profile?.role ?? "sender"
  }

  const heading = ROLE_TITLE[role] ?? ROLE_TITLE.sender

  // Метрики = демо-подложка + реальные заявки: дашборд всегда наполнен,
  // а каждая созданная заявка сразу двигает цифры
  const statsOrders = [...DEMO_BASELINE, ...orders]
  const stats = computeOrderStats(statsOrders)
  const dailySeries = computeDailySeries(statsOrders)

  const pending = orders.filter((o) => o.status === "Ожидает отправки")
  const inTransit = orders.filter((o) => o.status === "В пути")
  const delivered = orders.filter((o) => o.status === "Доставлен")

  const savedKm = orders.reduce((s, o) => s + Number(o.empty_km_saved ?? 0), 0)
  const savedKzt = orders.reduce((s, o) => s + Number(o.tenge_saved ?? 0), 0)
  const totalTons = orders.reduce((s, o) => s + Number(o.weight ?? 0), 0) / 1000

  const tableData = orders.map((o) => ({
    id: o.id,
    header: o.order_number,
    type: o.cargo_type,
    status: o.status,
    target: o.weight ? String(o.weight) : "—",
    limit: o.volume ? String(o.volume) : "—",
    reviewer: o.driver ?? "Не назначен",
    senderName: o.sender_name,
    senderAddress: o.sender_address,
    recipientName: o.recipient_name,
    recipientAddress: o.recipient_address,
    createdAt: o.created_at,
    deliveryDate: o.delivery_date,
  }))

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{heading.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{heading.subtitle}</p>
        </div>

        <Button asChild size="sm">
          <Link href="/dashboard/dispatch">
            {role === "carrier" ? "Открыть биржу заявок" : "Карта и трекинг"}
          </Link>
        </Button>
      </div>

      {/* ── Показатели под роль ── */}
      {role === "carrier" ? (
        <TileGrid>
          <KpiTile span={3} accent="amber" title="Свободных заявок"
            value={pending.length} icon={<IconPackage className="size-4" />}
            hint="можно взять прямо сейчас" />
          <KpiTile span={3} accent="blue" title="Ваших рейсов в пути"
            value={inTransit.length} icon={<IconTruckDelivery className="size-4" />}
            hint="груз едет" />
          <KpiTile span={3} accent="green" title="Порожних км сэкономлено"
            value={Math.round(savedKm).toLocaleString("ru-RU")} unit="км"
            icon={<IconTruckReturn className="size-4" />} hint="за счёт обратной загрузки" />
          <KpiTile span={3} accent="green" title="Заработано на связках"
            value={formatKzt(savedKzt)} icon={<IconCoin className="size-4" />}
            hint="топливо и время, которые не потрачены" />
        </TileGrid>
      ) : role === "dispatcher" ? (
        <TileGrid>
          <KpiTile span={3} accent="blue" title="Заявок в системе"
            value={stats.total.toLocaleString("ru-RU")} icon={<IconPackage className="size-4" />}
            hint="за последние 90 дней" />
          <KpiTile span={3} accent="amber" title="В пути сейчас"
            value={stats.inTransit} icon={<IconTruckDelivery className="size-4" />}
            hint="грузы в движении по области" />
          <KpiTile span={3} accent="green" title="Порожних км убрано"
            value={Math.round(savedKm).toLocaleString("ru-RU")} unit="км"
            icon={<IconRoute className="size-4" />} hint="накоплено платформой" />
          <KpiTile span={3} accent="green" title="Экономия перевозчикам"
            value={formatKzt(savedKzt)} icon={<IconCoin className="size-4" />}
            hint="топливо и время водителей" />
        </TileGrid>
      ) : (
        <TileGrid>
          <KpiTile span={3} accent="amber" title="Ждут перевозчика"
            value={pending.length} icon={<IconPackage className="size-4" />}
            hint={pending.length > 0 ? "заявки на бирже" : "все заявки разобраны"} />
          <KpiTile span={3} accent="blue" title="В пути"
            value={inTransit.length} icon={<IconTruckDelivery className="size-4" />}
            hint="можно отследить на карте" />
          <KpiTile span={3} accent="green" title="Доставлено"
            value={delivered.length} icon={<IconRoute className="size-4" />}
            hint="за всё время" />
          <KpiTile span={3} accent="slate" title="Отгружено"
            value={totalTons.toFixed(1)} unit="т"
            icon={<IconAlertTriangle className="size-4" />} hint="суммарный вес ваших грузов" />
        </TileGrid>
      )}

      {/* Диспетчеру — картина по направлениям области */}
      {role === "dispatcher" && <DirectionLoadCards />}

      <ChartAreaInteractive data={dailySeries} />

      <DataTable data={tableData} />
    </div>
  )
}
