"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type Customer = {
  id: number
  name: string
  city: string | null
  orders_count: number
  status: "Активный" | "На паузе" | "Новый"
  revenue: string | null
}

export async function getCustomers(): Promise<Customer[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name")

  if (error) {
    console.error("getCustomers error:", error.message)
    return []
  }
  return data ?? []
}

export async function seedDemoCustomers() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Не авторизован" }

  const demoCustomers = [
    { name: "ТОО «КазМунайТранс»",          city: "Актау",       orders_count: 284, status: "Активный" as const, revenue: "₸ 142 млн" },
    { name: "АО «НМСК Казмортрансфлот»",     city: "Актау",       orders_count: 196, status: "Активный" as const, revenue: "₸ 98 млн"  },
    { name: "ТОО «КаспийЛогистик»",          city: "Актау",       orders_count: 138, status: "Активный" as const, revenue: "₸ 67 млн"  },
    { name: "KTZE — KTZ Express",            city: "Астана",      orders_count: 112, status: "Активный" as const, revenue: "₸ 54 млн"  },
    { name: "ТОО «МангТрансОйл»",            city: "Жанаозен",    orders_count:  74, status: "На паузе" as const, revenue: "₸ 31 млн"  },
    { name: "АО «КазТрансОйл»",              city: "Актау",       orders_count:  89, status: "Активный" as const, revenue: "₸ 44 млн"  },
    { name: "ТОО «АгроЭкспорт KZ»",          city: "Бейнеу",      orders_count:  61, status: "Активный" as const, revenue: "₸ 18 млн"  },
    { name: "ИП Джаксыбеков А.",             city: "Актау",       orders_count:  43, status: "Новый"    as const, revenue: "₸ 8,4 млн" },
  ]

  const { error } = await supabase.from("customers").insert(
    demoCustomers.map((c) => ({ ...c, user_id: user.id }))
  )

  if (error) return { error: error.message }

  revalidatePath("/dashboard/customers")
  return { success: true }
}
