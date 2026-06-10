"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ArrowRight, ArrowUpRight } from "lucide-react"

const CARDS = [
  {
    label: "Паромная перевозка",
    img: "https://images.unsplash.com/photo-1759354017705-8bd86407ca5e?auto=format&fit=crop&w=600&h=820&q=80",
    bg: "linear-gradient(160deg,#c2410c,#7c2d12)",
  },
  {
    label: "Каспийский транзит",
    img: "https://images.unsplash.com/photo-1769144256181-698b8f807066?auto=format&fit=crop&w=600&h=820&q=80",
    bg: "linear-gradient(160deg,#0e7490,#155e75)",
  },
]

const ease = [0.16, 1, 0.3, 1] as const

export function LpServices() {
  return (
    <section id="services" className="bg-background lp-texture">
      <div className="mx-auto max-w-[1200px] px-6 py-20">

        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr]">

          {/* Left copy */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease }}
          >
            <h2 className="lp-display text-5xl font-extrabold leading-[1.04] tracking-tight text-foreground sm:text-6xl">
              Комплексная
              <br />
              живая логистика
              <br />
              Каспия
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Паромные рейсы, таможня и последняя миля — всё управляется из одной платформы. Создавайте заявку, ИИ подбирает рейс, перевозчик принимает за секунды.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
            >
              Изучить сервисы
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </motion.div>

          {/* Right — 2 tall photo cards */}
          <div className="grid grid-cols-2 gap-4">
            {CARDS.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, ease, delay: 0.1 + i * 0.1 }}
                className="group relative overflow-hidden rounded-[24px]"
                style={{ height: 360, background: card.bg }}
              >
                <img
                  src={card.img}
                  alt={card.label}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <button className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-foreground backdrop-blur-sm transition-transform group-hover:rotate-45">
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                </button>
                <span className="lp-display absolute bottom-5 left-5 right-5 text-lg font-bold leading-tight text-white">
                  {card.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>


      </div>
    </section>
  )
}
