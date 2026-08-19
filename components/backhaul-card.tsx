"use client"

import * as React from "react"
import { IconArrowNarrowRight, IconClock, IconDroplet, IconRoute, IconTruckReturn } from "@tabler/icons-react"

import { formatKzt, BODY_TYPE_LABELS, type BodyType } from "@/lib/economics"
import type { BackhaulSuggestion } from "@/lib/matching"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

// Карточка обратной загрузки — центральный элемент демо.
//
// Появляется автоматически, когда перевозчик открывает заявку: система
// уже нашла встречный груз и посчитала, сколько перевозчик сэкономит,
// если возьмёт связку вместо порожнего возврата.

function formatPickup(iso: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return "—"
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Aqtau",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function BackhaulCard({
  suggestion,
  bodyType,
  alternatives = [],
  onTakeBoth,
  taking = false,
}: {
  suggestion: BackhaulSuggestion
  bodyType?: BodyType
  alternatives?: BackhaulSuggestion[]
  onTakeBoth?: (suggestion: BackhaulSuggestion) => void
  taking?: boolean
}) {
  const [selected, setSelected] = React.useState(suggestion)
  const { saving } = selected

  const options = React.useMemo(
    () => [suggestion, ...alternatives],
    [suggestion, alternatives],
  )

  return (
    <Card className="border-emerald-500/40 bg-gradient-to-t from-emerald-500/10 to-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <IconTruckReturn className="size-5 text-emerald-600 dark:text-emerald-400" />
          Найдена обратная загрузка
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Что за груз и куда */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{selected.cargoType}</span>
            <Badge variant="outline" className="font-mono text-xs">
              {selected.orderNumber}
            </Badge>
            {bodyType ? <Badge variant="secondary">{BODY_TYPE_LABELS[bodyType]}</Badge> : null}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{selected.fromName}</span>
            <IconArrowNarrowRight className="size-4 shrink-0" />
            <span>{selected.toName}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Забрать: {formatPickup(selected.pickupFrom)}
          </div>
        </div>

        <Separator />

        {/* Главные две цифры — их и должно быть видно из зала */}
        <div className="space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Порожний пробег
            </div>
            <div className="flex items-baseline gap-2 text-2xl font-semibold tabular-nums">
              <span className="text-muted-foreground line-through decoration-2">
                {Math.round(saving.emptyKmWithout)} км
              </span>
              <IconArrowNarrowRight className="size-5 shrink-0 text-muted-foreground" />
              <span className="text-emerald-600 dark:text-emerald-400">
                {Math.round(saving.emptyKmWith)} км
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Вы экономите
            </div>
            <div className="text-3xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatKzt(saving.kztSaved)}
            </div>
          </div>
        </div>

        {/* Разбивка — чтобы на вопрос «откуда цифра» ответ был на экране */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <IconDroplet className="size-3.5" />
            топливо {saving.fuelLitersSaved.toFixed(1)} л
          </span>
          <span className="inline-flex items-center gap-1">
            <IconClock className="size-3.5" />
            время {saving.hoursSaved.toFixed(1)} ч
          </span>
          <span className="inline-flex items-center gap-1">
            <IconRoute className="size-3.5" />
            подача {selected.connectionKm.toFixed(0)} км
          </span>
        </div>

        {/* Альтернативы — показывают, что подбор не единственный подогнанный случай */}
        {options.length > 1 ? (
          <div className="space-y-1.5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Ещё варианты
            </div>
            <div className="flex flex-wrap gap-1.5">
              {options.map((opt) => (
                <button
                  key={opt.orderId}
                  type="button"
                  onClick={() => setSelected(opt)}
                  className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                    opt.orderId === selected.orderId
                      ? "border-emerald-500/60 bg-emerald-500/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {opt.fromName} → {opt.toName} · {formatKzt(opt.saving.kztSaved)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <Button
          className="w-full"
          disabled={taking}
          onClick={() => onTakeBoth?.(selected)}
        >
          {taking ? "Оформляем…" : "Взять оба рейса"}
        </Button>
      </CardContent>
    </Card>
  )
}
