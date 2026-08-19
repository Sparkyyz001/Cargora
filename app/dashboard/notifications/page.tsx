import {
  IconAlertTriangle,
  IconCircleCheck,
  IconMessageCircle,
  IconPackage,
  IconTruckDelivery,
  IconTruckReturn,
  type Icon,
} from "@tabler/icons-react"

import { createClient } from "@/lib/supabase/server"
import { formatKzt } from "@/lib/economics"
import { getIncidents } from "@/lib/incidents"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Лента событий платформы: заявки, связки, инциденты — в одном месте
// и в хронологическом порядке. Диспетчер видит, что произошло, пока
// он смотрел на карту.

export const dynamic = "force-dynamic"

type Event = {
  id: string
  at: number
  kind: "created" | "taken" | "delivered" | "backhaul" | "incident" | "message"
  title: string
  detail: string
}

const ICONS: Record<Event["kind"], Icon> = {
  created: IconPackage,
  taken: IconTruckDelivery,
  delivered: IconCircleCheck,
  backhaul: IconTruckReturn,
  incident: IconAlertTriangle,
  message: IconMessageCircle,
}

const STYLES: Record<Event["kind"], string> = {
  created: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  taken: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  delivered: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  backhaul: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  incident: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  message: "bg-orange-600/15 text-orange-700 dark:text-orange-400",
}

const KIND_LABEL: Record<Event["kind"], string> = {
  created: "Новая заявка",
  taken: "Взята в работу",
  delivered: "Доставлено",
  backhaul: "Обратная загрузка",
  incident: "Инцидент",
  message: "Сообщение",
}

const ROLE_IN_CHAT: Record<string, string> = {
  sender: "отправитель",
  carrier: "перевозчик",
  driver: "водитель",
  dispatcher: "диспетчер",
}

function ago(ms: number) {
  const min = Math.floor((Date.now() - ms) / 60_000)
  if (min < 1) return "только что"
  if (min < 60) return `${min} мин назад`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} ч назад`
  return `${Math.floor(h / 24)} дн назад`
}

export default async function NotificationsPage() {
  const supabase = await createClient()

  const [ordersRes, settlementsRes, messagesRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id,order_number,cargo_type,status,created_at,from_settlement_id,to_settlement_id,tenge_saved,empty_km_saved,matched_backhaul_id,driver")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("settlements").select("id,name"),
    supabase
      .from("order_messages")
      .select("id,order_id,author,role,body,created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ])

  const names = new Map((settlementsRes.data ?? []).map((s) => [s.id, s.name]))
  const events: Event[] = []

  for (const o of ordersRes.data ?? []) {
    const at = new Date(o.created_at as string).getTime()
    const route = `${names.get(o.from_settlement_id ?? -1) ?? "—"} → ${names.get(o.to_settlement_id ?? -1) ?? "—"}`

    if (o.status === "Доставлен") {
      events.push({
        id: `d-${o.id}`,
        at,
        kind: "delivered",
        title: `${o.order_number} доставлена`,
        detail: `${o.cargo_type} · ${route}${o.driver ? ` · ${o.driver}` : ""}`,
      })
    } else if (o.status === "В пути") {
      events.push({
        id: `t-${o.id}`,
        at,
        kind: "taken",
        title: `${o.order_number} в пути`,
        detail: `${o.cargo_type} · ${route}${o.driver ? ` · ${o.driver}` : ""}`,
      })
    } else {
      events.push({
        id: `c-${o.id}`,
        at,
        kind: "created",
        title: `${o.order_number} размещена на бирже`,
        detail: `${o.cargo_type} · ${route}`,
      })
    }

    if (o.matched_backhaul_id) {
      events.push({
        id: `b-${o.id}`,
        at: at + 60_000,
        kind: "backhaul",
        title: `Связка по ${o.order_number}`,
        detail: `Порожний пробег сокращён на ${Math.round(Number(o.empty_km_saved ?? 0))} км, экономия ${formatKzt(Number(o.tenge_saved ?? 0))}`,
      })
    }
  }

  // Переписка по заявкам: диспетчер видит вопросы, даже если не открывал карточку
  const orderNumbers = new Map(
    (ordersRes.data ?? []).map((o) => [o.id, o.order_number as string]),
  )

  for (const m of messagesRes.data ?? []) {
    events.push({
      id: `m-${m.id}`,
      at: new Date(m.created_at as string).getTime(),
      kind: "message",
      title: `${m.author}: ${m.body}`,
      detail: `${orderNumbers.get(m.order_id) ?? "заявка"} · ${ROLE_IN_CHAT[m.role as string] ?? m.role}`,
    })
  }

  for (const inc of getIncidents()) {
    events.push({
      id: `i-${inc.id}`,
      at: Date.now() - inc.hoursAgo * 3_600_000,
      kind: "incident",
      title: inc.title,
      detail: `${inc.lane}${inc.resolved ? " · закрыт" : ""}`,
    })
  }

  events.sort((a, b) => b.at - a.at)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-bold">Уведомления</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Всё, что произошло на платформе — заявки, связки, сообщения, инциденты
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Лента событий</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="divide-y">
            {events.slice(0, 50).map((e) => {
              const Icon = ICONS[e.kind]
              return (
                <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                  <div className={cn("grid size-8 shrink-0 place-items-center rounded-lg", STYLES[e.kind])}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{e.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {KIND_LABEL[e.kind]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{e.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{ago(e.at)}</span>
                </div>
              )
            })}

            {events.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Событий пока нет.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
