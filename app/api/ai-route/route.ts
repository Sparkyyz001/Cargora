import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { runMatch } from "@/lib/match-service"
import { parseMatchRequest } from "@/lib/match-request"
import { BODY_TYPE_LABELS, formatKzt, type BodyType } from "@/lib/economics"
import type { BackhaulSuggestion, CarrierMatch } from "@/lib/matching"

// POST /api/ai-route — подбор машины под заявку с объяснением на русском.
//
// Принципиально: все числа считает наш код (lib/matching + lib/economics)
// по данным из БД. LLM получает УЖЕ ГОТОВЫЙ результат и только формулирует
// его словами — она ничего не пересчитывает и не придумывает цифры.
// Без GROQ_API_KEY ответ собирается шаблоном, продукт работает полностью.

const COMMISSION_RATE = 0.02

type AiRouteResponse = {
  ok: true
  distanceKm: number
  minutes: number
  carrier: CarrierMatch | null
  backhaul: BackhaulSuggestion | null
  alternativeBackhauls: BackhaulSuggestion[]
  priceKzt: number
  commissionKzt: number
  fromName: string
  toName: string
  reasoning: string
  /** true — текст сгенерирован LLM, false — собран шаблоном. */
  llm: boolean
}

/** Запасное объяснение без LLM: те же числа, просто без литературной обработки. */
function fallbackReasoning(
  carrier: CarrierMatch | null,
  backhaul: BackhaulSuggestion | null,
  distanceKm: number,
  priceKzt: number,
  commissionKzt: number,
  fromName: string,
  toName: string,
): string {
  if (!carrier) {
    return `Свободной машины под этот груз сейчас нет. Плечо ${fromName} → ${toName} — ${Math.round(distanceKm)} км. Заявка размещена на бирже: перевозчики видят её в реальном времени.`
  }

  const base =
    `Рекомендую машину ${carrier.plate} (${BODY_TYPE_LABELS[carrier.bodyType]}, ${(carrier.capacityKg / 1000).toFixed(0)} т), водитель ${carrier.carrierName}. ` +
    `Плечо ${fromName} → ${toName} — ${Math.round(distanceKm)} км, подача ${Math.round(carrier.deadheadToPickupKm)} км. ` +
    `Стоимость рейса по рыночным ставкам — ${formatKzt(priceKzt)}, комиссия платформы 2% = ${formatKzt(commissionKzt)}.`

  if (!backhaul) return base

  return (
    `${base} Есть обратная загрузка: ${backhaul.cargoType}, ${backhaul.fromName} → ${backhaul.toName}. ` +
    `Со связкой порожний пробег падает с ${Math.round(backhaul.saving.emptyKmWithout)} до ${Math.round(backhaul.saving.emptyKmWith)} км — ` +
    `это ${formatKzt(backhaul.saving.kztSaved)} экономии на топливе и времени водителя.`
  )
}

async function explainWithLlm(
  apiKey: string,
  params: {
    cargoType: string
    weightKg: number
    bodyType: BodyType
    fromName: string
    toName: string
    distanceKm: number
    carrier: CarrierMatch
    priceKzt: number
    backhaul: BackhaulSuggestion | null
  },
): Promise<string | null> {
  const { carrier, backhaul } = params

  const backhaulBlock = backhaul
    ? `Обратная загрузка: ${backhaul.cargoType}, ${backhaul.fromName} → ${backhaul.toName}\n` +
      `Экономия: порожний пробег ${Math.round(backhaul.saving.emptyKmWithout)} км → ${Math.round(backhaul.saving.emptyKmWith)} км, ` +
      `${Math.round(backhaul.saving.kztSaved)} ₸, топлива ${backhaul.saving.fuelLitersSaved.toFixed(1)} л, времени ${backhaul.saving.hoursSaved.toFixed(1)} ч`
    : "Обратная загрузка: не найдена, возврат будет порожним"

  const systemPrompt = `Ты — диспетчер логистической платформы Мангистауской области.
Тебе дан РЕЗУЛЬТАТ РАСЧЁТА. Не пересчитывай, не выдумывай цифры, не добавляй свои.
Объясни водителю простым языком за 2-3 предложения, почему стоит взять этот рейс${backhaul ? " и связку с обратным грузом" : ""}.
Пиши на русском, обращайся на «вы», без воды и без списков.`

  const userPrompt = `Заявка: ${params.cargoType}, ${params.weightKg} кг, ${params.fromName} → ${params.toName}, ${Math.round(params.distanceKm)} км
Подобрана машина: ${carrier.plate}, ${BODY_TYPE_LABELS[carrier.bodyType]} ${(carrier.capacityKg / 1000).toFixed(0)} т, водитель ${carrier.carrierName}, подача ${Math.round(carrier.deadheadToPickupKm)} км
Стоимость рейса: ${params.priceKzt} ₸
${backhaulBlock}`

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 260,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(9_000),
    })

    if (!res.ok) return null
    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content?.trim() ?? ""
    return text || null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: "Не авторизован" }, { status: 401 })
  }

  let body: Record<string, unknown>
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

  const { settlementNames, carriers, backhaul, alternativeBackhauls, distanceKm, minutes } = result

  const carrier = carriers[0] ?? null
  const priceKzt = carrier?.suggestedPriceKzt ?? 0
  const commissionKzt = Math.round(priceKzt * COMMISSION_RATE)

  const fromName = settlementNames.get(parsed.request.fromSettlementId) ?? "—"
  const toName = settlementNames.get(parsed.request.toSettlementId) ?? "—"
  const cargoType = String(body.cargo_type ?? body.cargoType ?? "груз")

  // LLM только формулирует. Если ключа нет или Groq не ответил — шаблон.
  let reasoning: string | null = null
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey && carrier) {
    reasoning = await explainWithLlm(groqKey, {
      cargoType,
      weightKg: parsed.request.weightKg,
      bodyType: parsed.request.bodyType,
      fromName,
      toName,
      distanceKm,
      carrier,
      priceKzt,
      backhaul,
    })
  }

  const response: AiRouteResponse = {
    ok: true,
    distanceKm,
    minutes,
    carrier,
    backhaul,
    alternativeBackhauls,
    priceKzt,
    commissionKzt,
    fromName,
    toName,
    llm: reasoning !== null,
    reasoning:
      reasoning ??
      fallbackReasoning(carrier, backhaul, distanceKm, priceKzt, commissionKzt, fromName, toName),
  }

  return NextResponse.json(response)
}
