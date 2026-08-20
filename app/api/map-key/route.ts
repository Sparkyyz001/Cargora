import { createClient } from "@/lib/supabase/server"

// Ключ 2GIS для карт.
//
// NEXT_PUBLIC_-переменные вшиваются в бандл во время сборки: если ключ
// добавили в окружение уже после деплоя (или только в Preview), собранный
// код о нём не знает и карта молча остаётся пустой. Поэтому клиент,
// не найдя ключ в бандле, спрашивает его здесь — у живого сервера.
//
// Отдаём только вошедшим: карты есть лишь в кабинете, а разбрасываться
// ключом перед всем интернетом незачем.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ key: null }, { status: 401 })

  const key =
    process.env.NEXT_PUBLIC_2GIS_API_KEY ??
    process.env.TWOGIS_API_KEY ??
    process.env.GIS_API_KEY ??
    null

  return Response.json({ key }, { headers: { "Cache-Control": "no-store" } })
}
