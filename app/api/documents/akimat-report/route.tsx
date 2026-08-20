import { renderToBuffer } from "@react-pdf/renderer"

import { createClient } from "@/lib/supabase/server"
import { loadAkimatReport } from "@/lib/documents/akimat-report"
import { pdfResponse } from "@/lib/documents/pdf-response"
import { registerDocumentFonts } from "@/lib/documents/pdf-theme"
import { shortDate } from "@/lib/documents/format"
import { AkimatReportPdf } from "@/components/documents/akimat-report-pdf"

// Готовый PDF аналитической записки для акимата.
// Скачивается по умолчанию; с ?view=1 — предпросмотр в браузере.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Требуется вход", { status: 401 })

  const data = await loadAkimatReport()

  registerDocumentFonts()
  const buffer = await renderToBuffer(<AkimatReportPdf data={data} />)

  return pdfResponse(buffer, {
    filename: `Аналитическая записка ${shortDate(data.generatedAt)}.pdf`,
    inline: new URL(request.url).searchParams.get("view") === "1",
  })
}
