import type { BodyType } from "@/lib/economics"
import type { MatchRequest } from "@/lib/matching"

// Разбор и проверка тела запроса на подбор. Вынесено отдельно, потому что
// одинаково нужно и /api/match, и /api/ai-route.

const BODY_TYPES: BodyType[] = ["tent", "refrigerator", "dump", "flatbed", "manipulator"]

export function parseMatchRequest(input: unknown): { request: MatchRequest } | { error: string } {
  const body = (input ?? {}) as Record<string, unknown>

  const fromId = Number(body.fromSettlementId ?? body.from_settlement_id)
  const toId = Number(body.toSettlementId ?? body.to_settlement_id)
  const weightKg = Number(body.weightKg ?? body.weight)

  if (!Number.isFinite(fromId) || !Number.isFinite(toId)) {
    return { error: "Не указаны точки погрузки и разгрузки" }
  }
  if (fromId === toId) {
    return { error: "Точки погрузки и разгрузки совпадают" }
  }
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return { error: "Не указан вес груза" }
  }

  const bodyType = (body.bodyType ?? body.body_type ?? "tent") as BodyType
  if (!BODY_TYPES.includes(bodyType)) {
    return { error: `Неизвестный тип кузова: ${String(bodyType)}` }
  }

  const volumeRaw = Number(body.volumeM3 ?? body.volume)

  return {
    request: {
      fromSettlementId: fromId,
      toSettlementId: toId,
      weightKg,
      volumeM3: Number.isFinite(volumeRaw) && volumeRaw > 0 ? volumeRaw : undefined,
      bodyType,
      pickupFrom: String(body.pickupFrom ?? body.pickup_from ?? new Date().toISOString()),
      pickupTo: String(
        body.pickupTo ?? body.pickup_to ?? new Date(Date.now() + 86_400_000).toISOString(),
      ),
      excludeOrderId:
        Number.isFinite(Number(body.excludeOrderId)) ? Number(body.excludeOrderId) : undefined,
    },
  }
}
