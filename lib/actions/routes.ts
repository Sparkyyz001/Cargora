"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type Route = {
  id: number
  route_code: string
  from_city: string
  to_city: string
  driver: string
  eta: string
  progress: number
  status: "В пути" | "Завершается" | "Запланирован" | "Завершён"
}

export async function getRoutes(): Promise<Route[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("routes")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getRoutes error:", error.message)
    return []
  }
  return data ?? []
}

export async function seedDemoRoutes() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Не авторизован" }

  const demoRoutes = [
    { route_code: "ТМТМ-1042", from_city: "Порт Актау", to_city: "Туркменбаши", driver: "Ахмет С.", eta: "8ч 30м", progress: 68, status: "В пути" as const },
    { route_code: "ТМТМ-1043", from_city: "Порт Актау", to_city: "Баку (Алят)", driver: "Батыр Ж.", eta: "11ч 20м", progress: 41, status: "В пути" as const },
    { route_code: "МАН-1044", from_city: "Бейнеу", to_city: "Болашак КПП", driver: "Серик К.", eta: "1ч 45м", progress: 88, status: "Завершается" as const },
    { route_code: "МАН-1045", from_city: "Жанаозен", to_city: "Порт Актау", driver: "—", eta: "—", progress: 0, status: "Запланирован" as const },
    { route_code: "МАН-1046", from_city: "Актау", to_city: "Алматы", driver: "Нурлан Б.", eta: "18ч 00м", progress: 24, status: "В пути" as const },
    { route_code: "МАН-1047", from_city: "Актау", to_city: "Атырау", driver: "Арман Т.", eta: "5ч 10м", progress: 55, status: "В пути" as const },
  ]

  const { error } = await supabase.from("routes").insert(
    demoRoutes.map((r) => ({ ...r, user_id: user.id }))
  )

  if (error) return { error: error.message }

  revalidatePath("/dashboard/routes")
  return { success: true }
}

export async function deleteRoute(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from("routes").delete().eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/dashboard/routes")
  return { success: true }
}
