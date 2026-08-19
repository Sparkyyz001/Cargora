import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { runMatch } from "@/lib/match-service"
import { parseMatchRequest } from "@/lib/match-request"

// POST /api/match — подбор машины и обратной загрузки под заявку.
//
// Расстояния берутся только из public.distance_matrix: во время демо
// никаких обращений к OSRM быть не должно. Ответ укладывается в сотни
// миллисекунд — вся работа это четыре select и арифметика в памяти.

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: "Требуется авторизация" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Тело запроса не является JSON" }, { status: 400 })
  }

  const parsed = parseMatchRequest(body)
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 })
  }

  const result = await runMatch(supabase, parsed.request)
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  const { settlementNames, ...payload } = result
  return NextResponse.json({ ok: true, ...payload })
}
