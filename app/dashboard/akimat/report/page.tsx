import { DocumentView } from "@/components/documents/document-view"
import { shortDate } from "@/lib/documents/format"

// Аналитическая записка для акимата.
//
// Документ собирается в PDF на сервере (/api/documents/akimat-report):
// служебный бланк с адресатом, исходящим номером, разделами и подписью.
// Страница показывает готовый файл и даёт его скачать — записку можно
// сразу приложить к письму.

export const dynamic = "force-dynamic"

export default function AkimatReportPage() {
  return (
    <DocumentView
      title="Аналитическая записка"
      subtitle={`Грузоперевозки внутри Мангистауской области · ${shortDate(new Date())}`}
      href="/api/documents/akimat-report"
      filename={`Cargora-zapiska-${shortDate(new Date()).replace(/\./g, "-")}.pdf`}
      back="/dashboard/akimat"
      backLabel="К грузопотокам"
    />
  )
}
