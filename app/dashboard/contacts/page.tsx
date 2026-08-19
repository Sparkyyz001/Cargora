import { IconBuildingStore, IconTruck, IconUser } from "@tabler/icons-react"

import { createClient } from "@/lib/supabase/server"
import { DRIVERS } from "@/lib/drivers"
import { marketRatePerKm, type BodyType } from "@/lib/economics"
import { KpiTile, TileGrid } from "@/components/kpi-tile"
import { ContactsClient, type ContactCard, type ContactOrder } from "@/components/contacts-client"

// Контакты — участники перевозок области. Собираются из заявок и автопарка:
// контрагент появляется здесь ровно тогда, когда реально что-то отправил,
// принял или отвёз, а не заводится вручную.

export const dynamic = "force-dynamic"

export default async function ContactsPage() {
  const supabase = await createClient()

  const [ordersRes, vehiclesRes, settlementsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id,order_number,cargo_type,status,weight,driver,distance_km,body_type,created_at,sender_name,sender_phone,sender_address,recipient_name,recipient_phone,recipient_address,from_settlement_id,to_settlement_id")
      .order("created_at", { ascending: false }),
    supabase.from("vehicles").select("driver,plate,vehicle_code,status,body_type,capacity_kg"),
    supabase.from("settlements").select("id,name"),
  ])

  const orders = ordersRes.data ?? []
  const vehicles = vehiclesRes.data ?? []
  const names = new Map((settlementsRes.data ?? []).map((s) => [s.id, s.name]))

  const routeOf = (o: (typeof orders)[number]) =>
    `${names.get(o.from_settlement_id ?? -1) ?? "—"} → ${names.get(o.to_settlement_id ?? -1) ?? "—"}`

  const cards = new Map<string, ContactCard>()

  const touch = (
    id: string,
    base: Omit<ContactCard, "orders" | "tons" | "revenueKzt" | "history">,
  ) => {
    if (!cards.has(id)) {
      cards.set(id, { ...base, orders: 0, tons: 0, revenueKzt: 0, history: [] })
    }
    return cards.get(id)!
  }

  const push = (card: ContactCard, o: (typeof orders)[number]) => {
    const tons = Number(o.weight ?? 0) / 1000
    const km = Number(o.distance_km ?? 0)
    card.orders += 1
    card.tons += tons
    card.revenueKzt += Math.round((km * marketRatePerKm(Number(o.weight ?? 0))) / 100) * 100

    const entry: ContactOrder = {
      id: o.id,
      number: o.order_number,
      cargo: o.cargo_type,
      status: o.status,
      route: routeOf(o),
      tons,
      createdAt: o.created_at as string,
    }
    card.history.push(entry)
  }

  // ── Отправители и получатели ──
  for (const o of orders) {
    if (o.sender_name) {
      const card = touch(`sender:${o.sender_name}`, {
        id: `sender:${o.sender_name}`,
        name: o.sender_name,
        kind: "sender",
        phone: o.sender_phone,
        city: o.sender_address?.split(",")[0]?.trim() ?? null,
        address: o.sender_address,
      })
      card.phone ??= o.sender_phone
      push(card, o)
    }

    if (o.recipient_name) {
      const card = touch(`recipient:${o.recipient_name}`, {
        id: `recipient:${o.recipient_name}`,
        name: o.recipient_name,
        kind: "recipient",
        phone: o.recipient_phone,
        city: o.recipient_address?.split(",")[0]?.trim() ?? null,
        address: o.recipient_address,
      })
      card.phone ??= o.recipient_phone
      push(card, o)
    }
  }

  // ── Водители: справочник плюс закреплённая машина ──
  const vehicleByDriver = new Map(vehicles.filter((v) => v.driver).map((v) => [v.driver as string, v]))

  for (const d of DRIVERS) {
    const v = vehicleByDriver.get(d.key)
    const card = touch(`driver:${d.key}`, {
      id: `driver:${d.key}`,
      name: `${d.lastName} ${d.firstName}`,
      kind: "driver",
      phone: d.phone,
      city: null,
      address: null,
      driver: {
        ...d,
        plate: v?.plate ?? null,
        vehicleStatus: v?.status ?? null,
        bodyType: (v?.body_type ?? null) as BodyType | null,
      },
    })

    // Рейсы водителя: заявки, где он указан
    for (const o of orders) {
      if (o.driver && o.driver.includes(d.key)) push(card, o)
    }
  }

  const contacts = [...cards.values()].sort((a, b) => {
    // Водители наверх — с ними диспетчер работает чаще всего
    if (a.kind === "driver" && b.kind !== "driver") return -1
    if (b.kind === "driver" && a.kind !== "driver") return 1
    return b.orders - a.orders
  })

  const senders = contacts.filter((c) => c.kind === "sender").length
  const recipients = contacts.filter((c) => c.kind === "recipient").length
  const drivers = contacts.filter((c) => c.kind === "driver").length

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-bold">Контакты</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Участники перевозок области — нажмите на человека, чтобы увидеть подробности
        </p>
      </div>

      <TileGrid>
        <KpiTile span={4} accent="amber" title="Водители" value={drivers}
          icon={<IconTruck className="size-4" />} hint="с закреплёнными машинами" />
        <KpiTile span={4} accent="blue" title="Грузоотправители" value={senders}
          icon={<IconBuildingStore className="size-4" />} hint="кто размещает заявки" />
        <KpiTile span={4} accent="green" title="Получатели" value={recipients}
          icon={<IconUser className="size-4" />} hint="магазины, стройки, акиматы" />
      </TileGrid>

      <ContactsClient contacts={contacts} />
    </div>
  )
}
