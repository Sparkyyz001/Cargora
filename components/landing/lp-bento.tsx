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
    label: "Развоз по области",
    desc: "Магазины, стройки, фермы и отдалённые посёлки — от Актау до Бейнеу, 15 населённых пунктов в одной системе.",
    img: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=900&h=600&q=80",
    bg: "linear-gradient(160deg,#1d4ed8,#1e3a8a)",
    span: "lg:col-span-8",
    height: 340,
  },
  {
    label: "Обратная загрузка",
    desc: "Система сама находит встречный груз и показывает экономию в тенге.",
    img: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&h=600&q=80",
    bg: "linear-gradient(160deg,#047857,#064e3b)",
    span: "lg:col-span-4",
    height: 340,
  },
  {
    label: "Отдалённые посёлки",
    desc: "Доставка товаров первой необходимости туда, куда обычно не берутся ехать.",
    img: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&h=500&q=80",
    bg: "linear-gradient(160deg,#b45309,#78350f)",
    span: "lg:col-span-4",
    height: 280,
  },
  {
    label: "Складская обработка",
    desc: "Кросс-докинг и паллетирование на базах в Актау и Жанаозене.",
    img: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=600&h=500&q=80",
    bg: "linear-gradient(160deg,#475569,#1e293b)",
    span: "lg:col-span-4",
    height: 280,
  },
  {
    label: "Электронные документы",
    desc: "Накладные и акты приёмки — оформляются до выезда машины на рейс.",
    img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&h=500&q=80",
    bg: "linear-gradient(160deg,#334155,#0f172a)",
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
