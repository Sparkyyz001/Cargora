"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ArrowUpRight } from "lucide-react"

type Service = {
  label: string
  desc: string
  img: string
  bg: string
  span: string
  height: number
}

const SERVICES: Service[] = [
  {
    label: "Паромная перевозка",
    desc: "Полный и сборный груз (FCL/LCL) через все 5 стран Каспия с онлайн-трекингом каждого рейса.",
    img: "https://images.unsplash.com/photo-1759354017689-cf8b886b9f41?auto=format&fit=crop&w=900&h=600&q=80",
    bg: "linear-gradient(160deg,#0e7490,#0c4a6e)",
    span: "lg:col-span-8",
    height: 340,
  },
  {
    label: "Экспресс-рейсы",
    desc: "Срочные грузы: гарантированная отправка в течение 24 ч.",
    img: "https://images.unsplash.com/photo-1768341396356-1e6379914d67?auto=format&fit=crop&w=600&h=600&q=80",
    bg: "linear-gradient(160deg,#334155,#0f172a)",
    span: "lg:col-span-4",
    height: 340,
  },
  {
    label: "Автодоставка по КЗ",
    desc: "Сухопутные перевозки КамАЗ / Volvo — ИИ подбирает перевозчика и маршрут.",
    img: "https://images.unsplash.com/photo-1774116196662-a9e1e4fa1612?auto=format&fit=crop&w=600&h=500&q=80",
    bg: "linear-gradient(160deg,#c2410c,#7c2d12)",
    span: "lg:col-span-4",
    height: 280,
  },
  {
    label: "Хранение в порту",
    desc: "Таможенные склады, паллетирование и фулфилмент в Актауском МТП.",
    img: "https://images.unsplash.com/photo-1759272840538-ae4b07214c71?auto=format&fit=crop&w=600&h=500&q=80",
    bg: "linear-gradient(160deg,#475569,#1e293b)",
    span: "lg:col-span-4",
    height: 280,
  },
  {
    label: "Таможня и документы",
    desc: "Брокеридж, ЭЦП и комплаенс готовы до прихода груза в порт.",
    img: "https://images.unsplash.com/photo-1778629794381-d3ae4a54311c?auto=format&fit=crop&w=600&h=500&q=80",
    bg: "linear-gradient(160deg,#9a3412,#451a03)",
    span: "lg:col-span-4",
    height: 280,
  },
]

const ease = [0.16, 1, 0.3, 1] as const

function ServiceCard({ s, i }: { s: Service; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease, delay: i * 0.06 }}
      className={"group relative overflow-hidden rounded-[24px] " + s.span}
      style={{ height: s.height, background: s.bg }}
    >
      <img
        src={s.img}
        alt={s.label}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
      <button className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-foreground backdrop-blur-sm transition-transform group-hover:rotate-45">
        <ArrowUpRight className="h-5 w-5" strokeWidth={2} />
      </button>
      <div className="absolute bottom-6 left-6 right-6">
        <h3 className="lp-display text-2xl font-extrabold tracking-tight text-white">{s.label}</h3>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-white/75">{s.desc}</p>
      </div>
    </motion.div>
  )
}

export function LpBento() {
  return (
    <section id="platform" className="bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-16">

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease }}
              className="text-sm font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Наши сервисы
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease, delay: 0.05 }}
              className="lp-display mt-3 text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl"
            >
              Всё что нужно
              <br />
              вашей цепочке поставок
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease, delay: 0.1 }}
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              Все сервисы
              <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {SERVICES.map((s, i) => (
            <ServiceCard key={s.label} s={s} i={i} />
          ))}
        </div>

      </div>
    </section>
  )
}
