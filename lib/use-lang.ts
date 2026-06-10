"use client"

import { useCallback, useEffect, useState } from "react"
import { translations, type Lang } from "@/lib/i18n"

function getCookieLang(): Lang {
  if (typeof document === "undefined") return "ru"
  const match = document.cookie.match(/(?:^|; )lang=([^;]*)/)
  const val = match?.[1]
  return val === "kz" ? "kz" : "ru"
}

export function useLang() {
  const [lang, setLangState] = useState<Lang>("ru")

  useEffect(() => {
    setLangState(getCookieLang())
  }, [])

  const setLang = useCallback((l: Lang) => {
    document.cookie = `lang=${l}; path=/; max-age=31536000; SameSite=Lax`
    setLangState(l)
  }, [])

  return { lang, setLang, t: translations[lang] }
}
