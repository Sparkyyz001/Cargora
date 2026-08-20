import { createClient } from "@/lib/supabase/server"

// Ключ 2GIS для карт.
//
// NEXT_PUBLIC_-переменные вшиваются в бандл во время сборки: если ключ
// добавили в окружение уже после деплоя (или только в Preview), собранный
// код о нём не знает и карта молча остаётся пустой. Поэтому клиент,
// не найдя ключ в бандле, спрашивает его здесь — у живого сервера.
//
// Сам ключ отдаём только вошедшим: карты есть лишь в кабинете, а
// разбрасываться ключом перед всем интернетом незачем.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Ключ 2GIS — UUID. Всё остальное: кавычки, пробелы, перенос строки. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function readKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_2GIS_API_KEY ??
    process.env.TWOGIS_API_KEY ??
    process.env.GIS_API_KEY ??
    null
  )
}

/**
 * Самопроверка ключа: /api/map-key?check=1
 *
 * Отвечает на единственный вопрос, на который иначе не ответить, не войдя
 * в кабинет: почему на месте карты пусто. Ключ не раскрывается — только
 * его длина, форма и то, что на него отвечает сам 2GIS.
 */
async function selfCheck(raw: string | null) {
  if (!raw) return { configured: false }

  const trimmed = raw.trim().replace(/^["']|["']$/g, "")
  const check = {
    configured: true,
    length: raw.length,
    /** true — в значении затесались кавычки, пробелы или перенос строки */
    needsTrim: trimmed !== raw,
    looksLikeKey: UUID.test(trimmed),
    upstream: 0 as number,
  }

  try {
    const res = await fetch(
      `https://styles.api.2gis.com/styles/e05ac437-fcc2-4845-ad74-b1de9ce07555?key=${encodeURIComponent(trimmed)}`,
      { cache: "no-store" },
    )
    check.upstream = res.status
  } catch {
    check.upstream = -1
  }

  return check
}

export async function GET(request: Request) {
  const raw = readKey()

  if (new URL(request.url).searchParams.get("check") === "1") {
    return Response.json(await selfCheck(raw), { headers: { "Cache-Control": "no-store" } })
  }

  // Пробелы и кавычки вокруг значения — самая частая беда при вставке
  // ключа в панель хостинга: обрезаем, иначе 2GIS вернёт 403 на тайлы.
  const key = raw ? raw.trim().replace(/^["']|["']$/g, "") || null : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return Response.json({ key: null, configured: key !== null }, { status: 401 })

  return Response.json(
    { key, configured: key !== null },
    { headers: { "Cache-Control": "no-store" } },
  )
}
