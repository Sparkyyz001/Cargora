"use client"

import { IconPrinter } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

/** Печать штатным диалогом браузера: там же сохранение в PDF.
 *  Библиотека генерации PDF не нужна — стили под печать в globals.css. */
export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="gap-2">
      <IconPrinter className="size-4" />
      Печать / сохранить в PDF
    </Button>
  )
}
