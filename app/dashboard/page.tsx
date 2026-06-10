import { getOrders } from "@/lib/actions/orders"
import { createClient } from "@/lib/supabase/server"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"
import { DataTable } from "@/components/data-table"
import { DispatchView } from "@/components/dispatch-view"

export default async function Page() {
  const supabase = await createClient()

  const [orders, { data: { user } }] = await Promise.all([
    getOrders(),
    supabase.auth.getUser(),
  ])

  let role = "sender"
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    role = profile?.role ?? "sender"
  }

  const isCarrier = role === "carrier"

  const tableData = orders.map((o) => ({
    id: o.id,
    header: o.order_number,
    type: o.cargo_type,
    status: o.status,
    target: o.weight ? String(o.weight) : "—",
    limit: o.volume ? String(o.volume) : "—",
    reviewer: o.driver ?? "Не назначен",
    senderName: o.sender_name,
    senderAddress: o.sender_address,
    recipientName: o.recipient_name,
    recipientAddress: o.recipient_address,
    createdAt: o.created_at,
    deliveryDate: o.delivery_date,
  }))

  if (isCarrier) {
    return (
      <div className="flex flex-1 flex-col">
        <DispatchView />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {role === "dispatcher" && (
            <div className="px-4 lg:px-6 pb-2">
              <DispatchView />
            </div>
          )}
          <SectionCards />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive />
          </div>
          <DataTable data={tableData} />
        </div>
      </div>
    </div>
  )
}
