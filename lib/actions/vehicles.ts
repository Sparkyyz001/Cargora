"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type Vehicle = {
  id: number
  vehicle_code: string
  plate: string | null
  driver: string | null
  status: "В рейсе" | "Свободна" | "На ТО"
  load_percent: number
  route: string | null
}

export async function getVehicles(): Promise<Vehicle[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("vehicle_code")

  if (error) {
    console.error("getVehicles error:", error.message)
    return []
  }
  return data ?? []
}

export async function updateVehicleStatus(id: number, status: Vehicle["status"]) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("vehicles")
    .update({ status })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/dashboard/fleet")
  return { success: true }
}

export async function seedDemoVehicles() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Не авторизован" }

  const demoVehicles = [
    { vehicle_code: "АКТ-01", plate: "A 123 BCA 16", driver: "Ахмет С.", status: "В рейсе" as const, load_percent: 92, route: "Актау → Жанаозен" },
    { vehicle_code: "АКТ-02", plate: "B 456 KMA 16", driver: "Батыр Ж.", status: "В рейсе" as const, load_percent: 78, route: "Актау → Акшукур" },
    { vehicle_code: "АКТ-03", plate: "С 789 РН 16", driver: "Нурлан Б.", status: "Свободна" as const, load_percent: 0, route: "—" },
    { vehicle_code: "АКТ-04", plate: "Н 321 ЕК 16", driver: "Арман Т.", status: "На ТО" as const, load_percent: 0, route: "Сервис, Актау" },
    { vehicle_code: "ЖАН-05", plate: "M 654 OPA 16", driver: "Серик К.", status: "В рейсе" as const, load_percent: 95, route: "Жетыбай → Жанаозен" },
    { vehicle_code: "БЕЙ-06", plate: "К 987 АХ 16", driver: "Дауит М.", status: "Свободна" as const, load_percent: 0, route: "—" },
  ]

  const { error } = await supabase.from("vehicles").insert(
    demoVehicles.map((v) => ({ ...v, user_id: user.id }))
  )

  if (error) return { error: error.message }

  revalidatePath("/dashboard/fleet")
  return { success: true }
}
