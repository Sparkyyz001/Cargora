import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { translit } from "@/lib/documents/format"
import { DocumentView } from "@/components/documents/document-view"

// Товарно-транспортная накладная по заявке.
//
// Сама накладная собирается в PDF на сервере (/api/documents/waybill/[id]) —
// печатным бланком с рамками, суммой прописью и местом для подписей.
// Страница только показывает готовый файл и даёт его скачать: то, что
// видно на экране, и есть то, что уедет в папку загрузок.

export const dynamic = "force-dynamic"

export default async function WaybillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const orderId = Number(id)
  if (!Number.isFinite(orderId)) notFound()

  const supabase = await createClient()
  const { data: order } = await supabase
    .from("orders")
    .select("id,order_number,cargo_type")
    .eq("id", orderId)
    .maybeSingle()

  if (!order) notFound()

  return (
    <DocumentView
      title="Товарно-транспортная накладная"
      subtitle={`Заявка ${order.order_number} · ${order.cargo_type}`}
      href={`/api/documents/waybill/${order.id}`}
      filename={`Nakladnaya-${translit(order.order_number)}.pdf`}
      back="/dashboard/orders"
      backLabel="К заявкам"
    />
  )
}
