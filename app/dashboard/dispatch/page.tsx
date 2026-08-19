import { createClient } from "@/lib/supabase/server"
import { DispatchConsole } from "@/components/dispatch-console"

// Консоль диспетчера — главный экран демо: карта области с симуляцией
// суток слева, панель заявок и рейсов справа. Весь ключевой сценарий
// проходит здесь, без переходов между страницами.

export const dynamic = "force-dynamic"

const PENDING = ["Ожидает отправки", "Жіберілуді күтуде"]

export default async function DispatchPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [ordersRes, settlementsRes, distancesRes, profileRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .in("status", PENDING)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("settlements").select("id,name").order("id"),
    supabase.from("distance_matrix").select("from_id,to_id,km,minutes"),
    user
      ? supabase.from("profiles").select("full_name,role").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ])

  // Кто пишет в чат: имя и роль подписываются под каждым сообщением
  const profile = profileRes?.data as { full_name: string | null; role: string | null } | null
  const me = user
    ? {
        id: user.id,
        name: profile?.full_name ?? user.email?.split("@")[0] ?? "Пользователь",
        role: (profile?.role ?? "sender") as "sender" | "carrier" | "driver" | "dispatcher",
      }
    : null

  return (
    <DispatchConsole
      initialOrders={ordersRes.data ?? []}
      settlements={settlementsRes.data ?? []}
      distances={distancesRes.data ?? []}
      me={me}
    />
  )
}
