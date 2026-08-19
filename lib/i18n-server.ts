import "server-only"

import { cookies } from "next/headers"

import { translations, type Lang } from "@/lib/i18n"

// Чтение языка на сервере.
//
// Хук useLang клиентский и в серверных компонентах не работает, а почти
// все новые экраны серверные. Язык лежит в той же куке `lang`, которую
// пишет переключатель, поэтому клиент и сервер всегда согласованы.

export async function getLang(): Promise<Lang> {
  const store = await cookies()
  return store.get("lang")?.value === "kz" ? "kz" : "ru"
}

/** Словарь для серверного компонента. */
export async function getT() {
  const lang = await getLang()
  return { lang, t: translations[lang] }
}
