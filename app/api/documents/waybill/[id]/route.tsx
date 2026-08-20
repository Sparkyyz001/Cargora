import { renderToBuffer } from "@react-pdf/renderer"

import { createClient } from "@/lib/supabase/server"
import { loadWaybill } from "@/lib/documents/waybill"
import { pdfResponse } from "@/lib/documents/pdf-response"
import { registerDocumentFonts } from "@/lib/documents/pdf-theme"
import { WaybillPdf } from "@/components/documents/waybill-pdf"

// Готовый PDF товарно-транспортной накладной.
//
// Скачивается по умолчанию; с ?view=1 отдаётся тем же файлом для
// предпросмотра в браузере — это же используется на странице накладной.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const orderId = Number(id)
  if (!Number.isFinite(orderId)) {
    return new Response("Некорректный номер заявки", { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Требуется вход", { status: 401 })

  const data = await loadWaybill(orderId)
  if (!data) return new Response("Заявка не найдена", { status: 404 })

  registerDocumentFonts()
  const buffer = await renderToBuffer(<WaybillPdf data={data} />)

  return pdfResponse(buffer, {
    filename: `Накладная ${data.orderNumber}.pdf`,
    inline: new URL(request.url).searchParams.get("view") === "1",
  })
}
