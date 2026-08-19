import { getOrders } from "@/lib/actions/orders"
import { getLandRoutes } from "@/lib/actions/land-routes"
import { createClient } from "@/lib/supabase/server"
import { DispatchConsole } from "@/components/dispatch-console"

// Консоль диспетчера — главный экран демо: карта области слева,
// панель заявки справа. Весь ключевой сценарий проходит здесь,
// без переходов между страницами.

export const dynamic = "force-dynamic"

const PENDING = ["Ожидает отправки", "Жіберілуді күтуде"]

export default async function DispatchPage() {
  const supabase = await createClient()

  const [landRoutes, ordersRes, settlementsRes] = await Promise.all([
    getLandRoutes(),
    supabase
      .from("orders")
      .select("*")
      .in("status", PENDING)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("settlements").select("id,name").order("id"),
  ])

  return (
    <DispatchConsole
      initialOrders={ordersRes.data ?? []}
      landRoutes={landRoutes}
      settlements={settlementsRes.data ?? []}
    />
  )
}
