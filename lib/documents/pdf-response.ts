import { translit } from "@/lib/documents/format"

// Ответ с готовым PDF.
//
// По умолчанию файл скачивается: имя с кириллицей отдаём через filename*,
// а рядом кладём латинскую транслитерацию — старые клиенты и почтовые
// шлюзы иначе сохраняют документ под именем вида «__________.pdf».
// С ?view=1 тот же файл открывается в просмотрщике браузера — на этом
// держится предпросмотр документа на странице.

export function pdfResponse(
  buffer: Buffer | Uint8Array,
  { filename, inline = false }: { filename: string; inline?: boolean },
): Response {
  const ascii = translit(filename).replace(/[^\x20-\x7e]/g, "_")
  const disposition = inline ? "inline" : "attachment"

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(buffer.byteLength),
      // Документ собирается из живых данных заявки — кэшировать нечего.
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
