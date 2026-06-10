"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { ChevronDown, ArrowRight } from "lucide-react"

const FROM = [
  "Актау, Морпорт (KZ)",
  "Курык, новый порт (KZ)",
  "Атырау (KZ)",
  "Бейнеу (KZ)",
]

const TO = [
  "Туркменбаши (TM)",
  "Баку — Алят (AZ)",
  "Амирабад (IR)",
  "Энзели / Бандар-Энзели (IR)",
  "Махачкала (RU)",
  "Астрахань — Оля (RU)",
]

const PHOTOS = [
  {
    img: "https://images.unsplash.com/photo-1759354017689-cf8b886b9f41?auto=format&fit=crop&w=400&h=600&q=80",
    alt: "Паром на Каспийском море",
    overlay: null,
    bg: "linear-gradient(160deg,#0e7490,#0c4a6e)",
  },
  {
    img: "https://images.unsplash.com/photo-1759272840538-ae4b07214c71?auto=format&fit=crop&w=400&h=600&q=80",
    alt: "Контейнерный терминал",
    overlay: "Эффективность на каждом этапе маршрута",
    bg: "linear-gradient(160deg,#334155,#0f172a)",
  },
  {
    img: "https://images.unsplash.com/photo-1774116196662-a9e1e4fa1612?auto=format&fit=crop&w=400&h=600&q=80",
    alt: "Автодоставка по маршруту",
    overlay: null,
    bg: "linear-gradient(160deg,#c2410c,#7c2d12)",
  },
]

const ease = [0.16, 1, 0.3, 1] as const

export function LpSolutions() {
  const [from, setFrom] = useState(FROM[0])
  const [to,   setTo]   = useState(TO[0])

  return (
    <section id="solutions" className="bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-16">

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="lp-display text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-[40px]"
          >
            Сквозное управление&nbsp;&amp;
            <br />
            цепочка поставок
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease, delay: 0.1 }}
            className="max-w-xs text-sm leading-relaxed text-muted-foreground"
          >
            Один партнёр — паром, дорога и склад. Ваш груз с видимостью на каждом этапе от Актау до пункта назначения.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">

          {/* Image trio */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease }}
            className="grid grid-cols-3 gap-4"
          >
            {PHOTOS.map((p) => (
              <div
                key={p.alt}
                className="group relative overflow-hidden rounded-[22px]"
                style={{ height: 300, background: p.bg }}
              >
                <img
                  src={p.img}
                  alt={p.alt}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {p.overlay && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                    <span className="lp-display absolute bottom-4 left-4 right-4 text-sm font-bold leading-snug text-white">
                      {p.overlay}
                    </span>
                  </>
                )}
              </div>
            ))}
          </motion.div>

          {/* Route form card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease, delay: 0.1 }}
            className="rounded-[22px] border border-border bg-card p-6"
            style={{ boxShadow: "0 24px 48px -24px rgba(14,17,20,0.15)" }}
          >
            <h3 className="lp-display text-lg font-bold text-foreground">Найти паромный рейс</h3>
            <p className="mt-1 text-sm text-muted-foreground">Мгновенная оценка маршрута с ИИ.</p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Откуда</span>
                <div className="relative mt-1.5">
                  <select
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-border bg-muted px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  >
                    {FROM.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Куда</span>
                <div className="relative mt-1.5">
                  <select
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-border bg-muted px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  >
                    {TO.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </label>
            </div>

            <Link
              href="/login"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Подобрать рейс ИИ
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
