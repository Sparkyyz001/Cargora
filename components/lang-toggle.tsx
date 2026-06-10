"use client"

import { useLang } from "@/lib/use-lang"
import { Button } from "@/components/ui/button"

export function LangToggle() {
  const { lang, setLang } = useLang()

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2.5 text-xs font-semibold tracking-wide text-muted-foreground hover:text-foreground"
      onClick={() => setLang(lang === "ru" ? "kz" : "ru")}
      aria-label="Сменить язык"
    >
      {lang === "ru" ? "ҚАЗ" : "РУС"}
    </Button>
  )
}
