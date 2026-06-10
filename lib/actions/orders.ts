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

  const order_number = formData.get("order_number") as string
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
  })

  if (error) return { error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/orders")
  return { success: true }
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
    { order_number: "МАН-00157", cargo_type: "Нефтепродукты", status: "В пути" as const, weight: 18500, volume: 22, driver: "Ахмет С.", sender_name: "ТОО «КазМунайТранс»", sender_address: "Актау, Промзона", recipient_name: "Туркменбаши НПЗ", recipient_address: "Туркменбаши, Туркменистан" },
    { order_number: "МАН-00158", cargo_type: "Контейнер ТМТМ", status: "Доставлен" as const, weight: 22000, volume: 36, driver: "Батыр Ж.", sender_name: "COSCO Shipping KZ", sender_address: "Актау, Морпорт, прич. 3", recipient_name: "DB Cargo Europe", recipient_address: "Баку, Азербайджан" },
    { order_number: "МАН-00159", cargo_type: "Металлопрокат", status: "Доставлен" as const, weight: 32000, volume: 28, driver: "Нурлан Б.", sender_name: "АО «Қазцинк»", sender_address: "Актау, Терминал №2", recipient_name: "Arcelormittal", recipient_address: "Баку, порт Алят" },
    { order_number: "МАН-00160", cargo_type: "Зерновые грузы", status: "В пути" as const, weight: 25000, volume: 40, driver: "Арман Т.", sender_name: "ТОО «АгроЭкспорт»", sender_address: "Актау, Зерновой терминал", recipient_name: "Иранский экспорт", recipient_address: "Амирабад, Иран" },
    { order_number: "МАН-00161", cargo_type: "Строительные материалы", status: "Ожидает отправки" as const, weight: 14000, volume: 18, driver: "Серик К.", sender_name: "ТОО «Актауқұрылыс»", sender_address: "Актау, мкр 31", recipient_name: "ТОО «МангКурылыс»", recipient_address: "Жанаозен" },
    { order_number: "МАН-00162", cargo_type: "Химические грузы", status: "Доставлен" as const, weight: 9800, volume: 14, driver: "Ахмет С.", sender_name: "АО «Каустик»", sender_address: "Актау, Химпром", recipient_name: "Туркменхимия", recipient_address: "Туркменбаши, Туркменистан" },
    { order_number: "МАН-00163", cargo_type: "Нефтепродукты", status: "В пути" as const, weight: 21000, volume: 26, driver: "Батыр Ж.", sender_name: "АО «КазТрансОйл»", sender_address: "Актау, Нефтяной терминал", recipient_name: "SOCAR", recipient_address: "Баку, Нефтчала" },
    { order_number: "МАН-00164", cargo_type: "Контейнер ТМТМ", status: "Ожидает отправки" as const, weight: 19500, volume: 32, driver: "Нурлан Б.", sender_name: "China Merchants", sender_address: "Актау, Морпорт, прич. 1", recipient_name: "Hapag-Lloyd", recipient_address: "Баку, порт Алят" },
    { order_number: "МАН-00165", cargo_type: "Автомобили", status: "Доставлен" as const, weight: 16000, volume: 45, driver: "Дауит М.", sender_name: "ТОО «АвтоИмпорт»", sender_address: "Актау, СЭАЗ", recipient_name: "Дилерский центр", recipient_address: "Алматы, мкр Алтай" },
    { order_number: "МАН-00166", cargo_type: "Металлопрокат", status: "В пути" as const, weight: 28000, volume: 30, driver: "Арман Т.", sender_name: "ТОО «МетЛогистик»", sender_address: "Бейнеу, ж/д терминал", recipient_name: "Kardemir Steel", recipient_address: "Туркменбаши, порт" },
    { order_number: "МАН-00167", cargo_type: "Зерновые грузы", status: "Доставлен" as const, weight: 30000, volume: 42, driver: "Серик К.", sender_name: "ТОО «КазАгроЭкс»", sender_address: "Бейнеу, зерновой склад", recipient_name: "Tehran Grain", recipient_address: "Амирабад, Иран" },
    { order_number: "МАН-00168", cargo_type: "Строительные материалы", status: "Ожидает отправки" as const, weight: 11500, volume: 16, driver: "Ахмет С.", sender_name: "ТОО «ЖезқазғанЦемент»", sender_address: "Актау, склад №7", recipient_name: "ГП «ТуркменЗнак»", recipient_address: "Туркменабад, Туркменистан" },
    { order_number: "МАН-00169", cargo_type: "Химические грузы", status: "В пути" as const, weight: 7200, volume: 10, driver: "Батыр Ж.", sender_name: "ТОО «НефтеХим»", sender_address: "Жанаозен, завод", recipient_name: "Азот-Туркменистан", recipient_address: "Туркменбаши, хим. порт" },
    { order_number: "МАН-00170", cargo_type: "Нефтепродукты", status: "Доставлен" as const, weight: 24000, volume: 29, driver: "Дауит М.", sender_name: "ТОО «МангистауМунай»", sender_address: "Актау, Нефтяной терминал", recipient_name: "LUKOIL Overseas", recipient_address: "Махачкала, Россия" },
    { order_number: "МАН-00171", cargo_type: "Контейнер ТМТМ", status: "В пути" as const, weight: 20500, volume: 34, driver: "Нурлан Б.", sender_name: "KTZE (KTZ Express)", sender_address: "Актау, Морпорт, прич. 5", recipient_name: "ADY Container", recipient_address: "Баку, порт Алят" },
  ]

  const { error } = await supabase.from("orders").insert(
    demoOrders.map((o) => ({ ...o, user_id: user.id }))
  )

  if (error) return { error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/orders")
  return { success: true }
}
