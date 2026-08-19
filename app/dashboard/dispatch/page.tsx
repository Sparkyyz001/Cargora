import { createClient } from "@/lib/supabase/server"
import { DispatchConsole } from "@/components/dispatch-console"

// Консоль диспетчера — главный экран демо: карта области с симуляцией
// суток слева, панель заявок и рейсов справа. Весь ключевой сценарий
// проходит здесь, без переходов между страницами.

export const dynamic = "force-dynamic"

const PENDING = ["Ожидает отправки", "Жіберілуді күтуде"]

export default async function DispatchPage() {
  const supabase = await createClient()

  const [ordersRes, settlementsRes, distancesRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .in("status", PENDING)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("settlements").select("id,name").order("id"),
    supabase.from("distance_matrix").select("from_id,to_id,km,minutes"),
  ])

  return (
    <DispatchConsole
      initialOrders={ordersRes.data ?? []}
      settlements={settlementsRes.data ?? []}
      distances={distancesRes.data ?? []}
    />
  )
}
