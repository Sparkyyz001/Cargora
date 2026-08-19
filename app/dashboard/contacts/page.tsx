import { IconBuildingStore, IconPhone, IconTruck, IconUser } from "@tabler/icons-react"

import { createClient } from "@/lib/supabase/server"
import { KpiTile, TileGrid } from "@/components/kpi-tile"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Контакты — участники перевозок области: кто отправляет груз, кто везёт.
// Собираются из заявок, а не ведутся отдельным справочником: контрагент
// появляется здесь ровно тогда, когда реально что-то отправил или отвёз.

export const dynamic = "force-dynamic"

type Contact = {
  name: string
  phone: string | null
  city: string | null
  kind: "sender" | "recipient" | "carrier"
  orders: number
  tons: number
}

function initials(name: string) {
  const clean = name.replace(/^(ТОО|АО|ИП|КХ)\s*/i, "").replace(/[«»"]/g, "").trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")
}

const KIND_LABEL: Record<Contact["kind"], string> = {
  sender: "Грузоотправитель",
  recipient: "Получатель",
  carrier: "Перевозчик",
}

const KIND_STYLE: Record<Contact["kind"], string> = {
  sender: "border-blue-500/30 text-blue-600 dark:text-blue-400",
  recipient: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
  carrier: "border-amber-500/30 text-amber-600 dark:text-amber-400",
}

export default async function ContactsPage() {
  const supabase = await createClient()

  const [ordersRes, vehiclesRes] = await Promise.all([
    supabase
      .from("orders")
      .select("sender_name,sender_phone,sender_address,recipient_name,recipient_phone,recipient_address,weight"),
    supabase.from("vehicles").select("driver,plate,vehicle_code,status,body_type,capacity_kg"),
  ])

  const orders = ordersRes.data ?? []
  const vehicles = vehiclesRes.data ?? []

  const map = new Map<string, Contact>()

  const add = (
    name: string | null,
    phone: string | null,
    address: string | null,
    kind: Contact["kind"],
    weight: number | null,
  ) => {
    if (!name) return
    const key = `${kind}:${name}`
    const existing = map.get(key)
    const city = address?.split(",")[0]?.trim() ?? null
    if (existing) {
      existing.orders += 1
      existing.tons += Number(weight ?? 0) / 1000
      existing.phone ??= phone
      existing.city ??= city
    } else {
      map.set(key, {
        name,
        phone,
        city,
        kind,
        orders: 1,
        tons: Number(weight ?? 0) / 1000,
      })
    }
  }

  for (const o of orders) {
    add(o.sender_name, o.sender_phone, o.sender_address, "sender", o.weight)
    add(o.recipient_name, o.recipient_phone, o.recipient_address, "recipient", o.weight)
  }

  const contacts = [...map.values()].sort((a, b) => b.orders - a.orders)
  const senders = contacts.filter((c) => c.kind === "sender")
  const recipients = contacts.filter((c) => c.kind === "recipient")

  // Водители: уникальные по имени, с закреплённой машиной
  const drivers = [...new Map(vehicles.filter((v) => v.driver).map((v) => [v.driver as string, v])).values()]

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-bold">Контакты</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Участники перевозок области — собираются из заявок, отдельно вести не нужно
        </p>
      </div>

      <TileGrid>
        <KpiTile span={4} accent="blue" title="Грузоотправители" value={senders.length}
          icon={<IconBuildingStore className="size-4" />} hint="кто размещает заявки" />
        <KpiTile span={4} accent="green" title="Получатели" value={recipients.length}
          icon={<IconUser className="size-4" />} hint="магазины, стройки, акиматы" />
        <KpiTile span={4} accent="amber" title="Водители" value={drivers.length}
          icon={<IconTruck className="size-4" />} hint="закреплены за машинами" />
      </TileGrid>

      {/* ── Водители ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Водители и закреплённые машины</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.map((v) => (
            <div key={v.driver} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-500/15 text-xs font-semibold text-amber-600 dark:text-amber-400">
                {initials(v.driver as string)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{v.driver}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {v.plate} · {v.vehicle_code}
                </p>
              </div>
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  v.status === "Свободна" && "bg-emerald-500",
                  v.status === "В рейсе" && "bg-amber-500",
                  v.status === "На ТО" && "bg-slate-500",
                )}
                title={v.status ?? ""}
              />
            </div>
          ))}
          {drivers.length === 0 && (
            <p className="text-sm text-muted-foreground">Водители появятся вместе с автопарком.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Контрагенты ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Контрагенты</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Название</th>
                  <th className="px-4 py-2 text-left font-medium">Роль</th>
                  <th className="px-4 py-2 text-left font-medium">Пункт</th>
                  <th className="px-4 py-2 text-left font-medium">Телефон</th>
                  <th className="px-4 py-2 text-right font-medium">Заявок</th>
                  <th className="px-4 py-2 text-right font-medium">Тонн</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={`${c.kind}-${c.name}`} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold">
                          {initials(c.name)}
                        </div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className={cn("text-[10px]", KIND_STYLE[c.kind])}>
                        {KIND_LABEL[c.kind]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{c.city ?? "—"}</td>
                    <td className="px-4 py-2">
                      {c.phone ? (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <IconPhone className="size-3.5" />
                          {c.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">{c.orders}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {c.tons > 0 ? c.tons.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Контакты появятся, как только пройдут первые заявки.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
