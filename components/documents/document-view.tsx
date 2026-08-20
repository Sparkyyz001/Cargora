import Link from "next/link"
import { IconArrowLeft, IconDownload, IconExternalLink, IconFileTypePdf } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

// Экран документа: сверху панель, ниже — сам PDF в просмотрщике браузера.
//
// Показываем ровно тот файл, который скачается, — так видно, что уедет
// в акимат или ляжет в папку с накладными. На телефоне встроенный
// просмотрщик PDF в iframe работает не везде, поэтому там вместо него
// кнопки: открыть отдельной вкладкой или сохранить.

export function DocumentView({
  title,
  subtitle,
  href,
  filename,
  back,
  backLabel = "Назад",
}: {
  title: string
  subtitle: string
  /** Адрес, по которому отдаётся PDF (без параметров). */
  href: string
  filename: string
  back?: string
  backLabel?: string
}) {
  const view = `${href}?view=1`

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {back ? (
            <Button variant="ghost" size="icon" asChild aria-label={backLabel}>
              <Link href={back}>
                <IconArrowLeft className="size-4" />
              </Link>
            </Button>
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
            <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={view} target="_blank" rel="noreferrer">
              <IconExternalLink className="size-4" />
              Открыть отдельно
            </a>
          </Button>
          <Button asChild>
            <a href={href} download={filename}>
              <IconDownload className="size-4" />
              Скачать PDF
            </a>
          </Button>
        </div>
      </div>

      {/* Предпросмотр: на десктопе документ виден целиком, как на бумаге */}
      <div className="hidden overflow-hidden rounded-xl border bg-muted/30 md:block">
        <iframe
          src={view}
          title={title}
          className="h-[calc(100vh-12rem)] min-h-[560px] w-full"
        />
      </div>

      <div className="flex flex-col items-center gap-3 rounded-xl border p-8 text-center md:hidden">
        <IconFileTypePdf className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Документ готов. Откройте его отдельной вкладкой или сохраните файл —
          на телефоне PDF показывает системный просмотрщик.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" asChild>
            <a href={view} target="_blank" rel="noreferrer">
              Открыть документ
            </a>
          </Button>
          <Button asChild>
            <a href={href} download={filename}>
              Скачать PDF
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
