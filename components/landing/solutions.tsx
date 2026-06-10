"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const stats = [
  { value: "12M т",   label: "Грузооборот порта Актау в год"  },
  { value: "4 страны", label: "Каспийский коридор: KZ TM AZ IR" },
  { value: "14 часов", label: "Быстрейший рейс Актау → Туркменбаши" },
  { value: "2%",       label: "Комиссия — только за доставку"  },
]

const cards = [
  {
    img: "https://images.unsplash.com/photo-1577993831514-55cf2fb4f600?auto=format&fit=crop&w=600&h=420&q=80",
    label: "Паромный транзит",
    badge: "Актау → Туркменбаши",
    rotate: "-rotate-2",
    delay: 0.1,
  },
  {
    img: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=600&h=420&q=80",
    label: "Коридор ТМТМ",
    badge: "4 страны Каспия",
    rotate: "rotate-2",
    delay: 0.22,
  },
]

export function Solutions() {
  return (
    <section className="py-24 px-4 lg:px-6">
      <div className="mx-auto max-w-6xl">

        {/* Top: text + cards */}
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr]">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-orange-500">Возможности платформы</p>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.6rem] lg:leading-[1.15]">
              Комплексная логистика
              <br />
              Каспийского моря
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
              Единая платформа для грузоотправителей и перевозчиков — от подбора парома до подтверждения доставки в порту назначения.
            </p>
            <Button asChild className="mt-8 gap-2 rounded-full px-6" size="lg">
              <Link href="/login">
                Изучить маршруты
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </motion.div>

          {/* Right — staggered photo cards */}
          <div className="relative flex items-center justify-center gap-4 py-8 lg:py-0">
            {cards.map((card) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: card.delay }}
                className={`relative w-[46%] overflow-hidden rounded-2xl shadow-xl ${card.rotate}`}
                style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.14)" }}
              >
                <img
                  src={card.img}
                  alt={card.label}
                  className="h-56 w-full object-cover sm:h-64 lg:h-72"
                  loading="lazy"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                {/* Badge top-right */}
                <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-foreground shadow-sm">
                  {card.badge}
                </span>
                {/* Label bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-sm font-semibold text-white">{card.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>


      </div>
    </section>
  )
}
