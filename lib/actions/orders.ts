"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type Order = {
  id: number
  order_number: string
  cargo_type: string
  status: "Ожидает отправки" | "В пути" | "Доставлен"
  weight: number | null
  volume: number | null
  driver: string | null
  delivery_date: string | null
  sender_name: string | null
  sender_phone: string | null
  sender_address: string | null
  recipient_name: string | null
  recipient_phone: string | null
  recipient_address: string | null
  created_at: string
  // Поля внутрирегиональной перевозки. Необязательные: у заявок, созданных
  // до миграции, их нет, и весь остальной код продолжает работать.
  from_settlement_id?: number | null
  to_settlement_id?: number | null
  body_type?: string | null
  pickup_from?: string | null
  pickup_to?: string | null
  carrier_id?: string | null
  matched_backhaul_id?: number | null
  distance_km?: number | null
  empty_km_saved?: number | null
  tenge_saved?: number | null
  price_kzt?: number | null
}

export async function getOrders(): Promise<Order[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getOrders error:", error.message)
    return []
  }
  return data ?? []
}

export async function createOrder(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Не авторизован" }

  // Номер присваивает система: продолжаем нумерацию от последнего заказа
  let order_number = (formData.get("order_number") as string) || ""
  if (!order_number) {
    const { data: last } = await supabase
      .from("orders")
      .select("order_number")
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()
    const m = last?.order_number?.match(/(\d+)$/)
    const next = m ? Number(m[1]) + 1 : 172
    order_number = `МАН-${String(next).padStart(5, "0")}`
  }

  const cargo_type = formData.get("cargo_type") as string
  const status = formData.get("status") as Order["status"]
  const weight = Number(formData.get("weight")) || null
  const volume = Number(formData.get("volume")) || null
  const driver = (formData.get("driver") as string) || null
  const delivery_date = (formData.get("delivery_date") as string) || null
  const sender_name = (formData.get("sender_name") as string) || null
  const sender_phone = (formData.get("sender_phone") as string) || null
  const sender_address = (formData.get("sender_address") as string) || null
  const recipient_name = (formData.get("recipient_name") as string) || null
  const recipient_phone = (formData.get("recipient_phone") as string) || null
  const recipient_address = (formData.get("recipient_address") as string) || null

  // Поля внутрирегиональной перевозки: без них не работает подбор машины
  // и обратной загрузки — матчинг ищет по id населённых пунктов.
  const from_settlement_id = Number(formData.get("from_settlement_id")) || null
  const to_settlement_id = Number(formData.get("to_settlement_id")) || null
  const body_type = (formData.get("body_type") as string) || null
  const pickup_from = (formData.get("pickup_from") as string) || null
  const pickup_to = (formData.get("pickup_to") as string) || null
  const distance_km = Number(formData.get("distance_km")) || null

  const { error } = await supabase.from("orders").insert({
    user_id: user.id,
    order_number,
    cargo_type,
    status,
    weight,
    volume,
    driver,
    delivery_date,
    sender_name,
    sender_phone,
    sender_address,
    recipient_name,
    recipient_phone,
    recipient_address,
    from_settlement_id,
    to_settlement_id,
    body_type,
    pickup_from,
    pickup_to,
    distance_km,
  })

  if (error) return { error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/orders")
  return { success: true, order_number }
}

export async function updateOrderStatus(id: number, status: Order["status"]) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/orders")
  return { success: true }
}

export async function updateOrderDriver(id: number, driver: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("orders")
    .update({ driver })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/dashboard/orders")
  return { success: true }
}

export async function deleteOrder(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from("orders").delete().eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/orders")
  return { success: true }
}

export async function seedDemoOrders() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Не авторизован" }

  const demoOrders = [
    { order_number: "МАН-00157", cargo_type: "Продукты питания",   status: "В пути" as const,           weight: 3400,  volume: 15, driver: "Ахмет С.",  sender_name: "ТОО «Каспий Фуд»",       sender_address: "Актау, промзона, база №4",  recipient_name: "Магазин «Береке»",       recipient_address: "Жанаозен, мкр Шанырак" },
    { order_number: "МАН-00158", cargo_type: "Стройматериалы",     status: "Доставлен" as const,        weight: 17500, volume: 24, driver: "Батыр Ж.",  sender_name: "ТОО «Актауқұрылыс»",     sender_address: "Актау, мкр 31, склад",      recipient_name: "ИП Сарсенов",            recipient_address: "Шетпе, ул. Абая" },
    { order_number: "МАН-00159", cargo_type: "Инертные материалы", status: "Доставлен" as const,        weight: 20000, volume: 12, driver: "Нурлан Б.", sender_name: "Карьер «Жетібай»",       sender_address: "Жетыбай, карьер",           recipient_name: "ТОО «Актау Бетон»",      recipient_address: "Актау, бетонный узел" },
    { order_number: "МАН-00160", cargo_type: "Питьевая вода",      status: "В пути" as const,           weight: 6200,  volume: 18, driver: "Арман Т.",  sender_name: "ТОО «Ак Су»",            sender_address: "Актау, мкр 27",             recipient_name: "Сельский акимат Таушык", recipient_address: "Таушык, центр" },
    { order_number: "МАН-00161", cargo_type: "Стройматериалы",     status: "Ожидает отправки" as const, weight: 14000, volume: 18, driver: "Серик К.",  sender_name: "ТОО «Актауқұрылыс»",     sender_address: "Актау, мкр 31",             recipient_name: "ТОО «МангКурылыс»",      recipient_address: "Жанаозен, стройплощадка" },
    { order_number: "МАН-00162", cargo_type: "Комбикорм",          status: "Доставлен" as const,        weight: 7100,  volume: 20, driver: "Ахмет С.",  sender_name: "ТОО «Агроснаб Актау»",   sender_address: "Актау, база «Агро»",        recipient_name: "КХ «Сенек»",             recipient_address: "Сенек, ферма" },
    { order_number: "МАН-00163", cargo_type: "Товары народного потребления", status: "В пути" as const, weight: 4300, volume: 21, driver: "Батыр Ж.", sender_name: "ТОО «Мангистау Трейд»", sender_address: "Актау, оптовая база",     recipient_name: "Магазин «Ақшұқыр»",      recipient_address: "Акшукур, ул. Достык" },
  ]

  // Разносим заявки по последним двум неделям, чтобы графики не были плоскими
  const offsets = [0, 1, 3, 5, 8, 11, 14]

  const daysAgo = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString()
  }

  const { error } = await supabase.from("orders").insert(
    demoOrders.map((o, i) => ({
      ...o,
      user_id: user.id,
      created_at: daysAgo(offsets[i % offsets.length]),
    }))
  )

  if (error) return { error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/orders")
  return { success: true }
}
