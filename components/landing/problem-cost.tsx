"use client"

import * as React from "react"
import { motion, useInView } from "motion/react"

import {
  BASELINE_EMPTY_RUN_SHARE,
  REGION_TRUCK_COUNT,
} from "@/lib/economics"

// Стоимость проблемы — первое, что человек видит после заголовка.
//
// Раньше здесь была лента «15 населённых пунктов». Она правдива, но
// ничего не доказывает: посетитель читает и идёт дальше. Цифра потерь
// работает иначе — она сразу задаёт масштаб, а источник под ней снимает
// вопрос «откуда взяли» до того, как его успеют задать.

const ease = [0.16, 1, 0.3, 1] as const

/** Счётчик, который добегает до значения, когда секция появляется на экране. */
function Counter({
  to,
  decimals = 0,
  duration = 1.6,
}: {
  to: number
  decimals?: number
  duration?: number
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  const [value, setValue] = React.useState(0)

  React.useEffect(() => {
    if (!inView) return

    let raf = 0
    const start = performance.now()

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / (duration * 1000))
      // easeOutCubic: быстро в начале, мягко к концу
      setValue(to * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration])

  return (
    <span ref={ref} className="tabular-nums">
      {value.toLocaleString("ru-RU", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  )
}

const FACTS = [
  {
    value: REGION_TRUCK_COUNT,
    decimals: 0,
    suffix: "",
    label: "грузовиков в области",
    source: "БНС на 01.03.2026",
  },
  {
    value: BASELINE_EMPTY_RUN_SHARE * 100,
    decimals: 1,
    suffix: "%",
    label: "пробега уходит порожняком",
    source: "Eurostat 2024, внутренние перевозки ЕС",
  },
  {
    value: 210,
    decimals: 0,
    suffix: "",
    label: "направлений посчитано по дорогам",
    source: "OSRM по графу OpenStreetMap",
  },
]

export function ProblemCost() {
  return (
    <section className="relative overflow-hidden border-y bg-card">
      {/* Видео фоном, сильно приглушённое: оно задаёт настроение,
          но не спорит с цифрой — читаемость важнее эффекта */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.14] dark:opacity-[0.10]"
        src="/carriers.mp4"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-card via-card/85 to-card"
      />

      <div className="relative mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
        {/* ── Цифра потерь ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Сколько стоит проблема
          </p>

          <div className="lp-display mt-4 text-[clamp(3.5rem,12vw,8rem)] font-extrabold leading-[0.95] tracking-tight text-primary">
            <Counter to={23712} /> ₸
          </div>

          <p className="mx-auto mt-5 max-w-xl text-balance text-lg leading-relaxed text-foreground/80">
            Столько теряет перевозчик на <strong className="font-semibold">одном</strong> порожнем
            возврате Актау → Жанаозен. Только топливо и время водителя.
          </p>

          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Сам рейс приносит 62–116 тысяч тенге по ставкам биржи DELLA. То есть пустая дорога
            обратно съедает от 20 до 38 процентов выручки — и так каждый рейс.
          </p>
        </motion.div>

        {/* ── Подтверждающие цифры ── */}
        <div className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-3">
          {FACTS.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.1, ease }}
              className="text-center"
            >
              <div className="lp-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                <Counter to={f.value} decimals={f.decimals} />
                {f.suffix}
              </div>
              <p className="mt-2 text-sm font-medium text-foreground/80">{f.label}</p>
              {/* Источник рядом с цифрой, а не в сноске: вопрос «откуда»
                  должен закрываться в тот же момент, когда возникает */}
              <p className="mt-1 text-xs text-muted-foreground">{f.source}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Что с этим делает платформа ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.35, ease }}
          className="mx-auto mt-16 max-w-2xl rounded-2xl border bg-background p-6 text-center sm:p-8"
        >
          <p className="text-balance text-lg leading-relaxed sm:text-xl">
            Cargora находит перевозчику встречный груз в момент, когда он открывает заявку —
            и показывает экономию в тенге до того, как он согласится ехать.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Ни ATI.SU, ни Della, ни inDrive этого не делают: там есть только ручной фильтр
            «попутный груз».
          </p>
        </motion.div>
      </div>
    </section>
  )
}
