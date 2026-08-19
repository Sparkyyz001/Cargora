import * as React from "react"

import { cn } from "@/lib/utils"

// Плитка показателя. Визуальный язык взят из консоли Fleetbase:
// цветной акцент задаётся диагональным градиентом от 10–12% оттенка
// к прозрачному, рамка того же тона на ~28% непрозрачности, иконка
// в квадратном чипе с 12% подложкой, подъём тени на наведении.
//
// Сетка дашборда — 12 колонок, плитка занимает `span` из них.

export type TileAccent = "blue" | "green" | "amber" | "rose" | "slate"

const ACCENTS: Record<TileAccent, { wrapper: string; icon: string }> = {
  blue: {
    // Название сохранено ради совместимости вызовов, цвет — терракота:
    // в тёплой палитре синий акцент выпадал из семейства
    wrapper:
      "border-orange-600/30 bg-[linear-gradient(135deg,rgb(234_88_12/0.10)_0%,rgb(234_88_12/0)_62%)]",
    icon: "text-orange-700 bg-orange-600/12 dark:text-orange-400",
  },
  green: {
    wrapper:
      "border-emerald-500/30 bg-[linear-gradient(135deg,rgb(16_185_129/0.10)_0%,rgb(16_185_129/0)_62%)]",
    icon: "text-emerald-600 bg-emerald-500/12 dark:text-emerald-400",
  },
  amber: {
    wrapper:
      "border-amber-500/32 bg-[linear-gradient(135deg,rgb(245_158_11/0.12)_0%,rgb(245_158_11/0)_62%)]",
    icon: "text-amber-600 bg-amber-500/14 dark:text-amber-400",
  },
  rose: {
    wrapper:
      "border-rose-500/30 bg-[linear-gradient(135deg,rgb(244_63_94/0.10)_0%,rgb(244_63_94/0)_62%)]",
    icon: "text-rose-600 bg-rose-500/12 dark:text-rose-400",
  },
  slate: {
    wrapper:
      "border-stone-500/28 bg-[linear-gradient(135deg,rgb(120_113_108/0.10)_0%,rgb(120_113_108/0)_62%)]",
    icon: "text-stone-600 bg-stone-500/12 dark:text-stone-300",
  },
}

export function KpiTile({
  title,
  value,
  unit,
  hint,
  icon,
  accent = "slate",
  span = 3,
  className,
}: {
  title: string
  value: React.ReactNode
  /** Единица измерения — приписывается к значению мелким шрифтом. */
  unit?: string
  /** Подпись под значением: источник цифры или пояснение. */
  hint?: React.ReactNode
  icon?: React.ReactNode
  accent?: TileAccent
  /** Сколько из 12 колонок занимает плитка на широком экране. */
  span?: 2 | 3 | 4 | 6 | 12
  className?: string
}) {
  const a = ACCENTS[accent]

  const spanClass = {
    2: "lg:col-span-2",
    3: "lg:col-span-3",
    4: "lg:col-span-4",
    6: "lg:col-span-6",
    12: "lg:col-span-12",
  }[span]

  return (
    <div
      className={cn(
        "col-span-2 rounded-xl border p-4 transition-[transform,box-shadow,border-color] duration-150 ease-out",
        "hover:shadow-[0_8px_24px_-12px_rgb(15_23_42/0.35)]",
        a.wrapper,
        spanClass,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon ? (
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", a.icon)}>
            {icon}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums">{value}</span>
        {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
      </div>

      {hint ? <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

/** Сетка дашборда: 2 колонки на телефоне, 12 на широком экране. */
export function TileGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 lg:grid-cols-12", className)}>{children}</div>
  )
}
