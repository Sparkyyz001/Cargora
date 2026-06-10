"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ChevronDown, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const gridPhotos = [
  {
    img: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=600&h=500&q=80",
    alt: "Паром на Каспийском море",
    span: "row-span-2",
    overlay: null,
  },
  {
    img: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=600&h=300&q=80",
    alt: "Контейнерный порт",
    span: "",
    overlay: "Эффективность на каждом этапе маршрута",
  },
  {
    img: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?auto=format&fit=crop&w=600&h=300&q=80",
    alt: "Контейнеры в порту",
    span: "",
    overlay: null,
  },
]

const FROM_OPTIONS = ["Актау, Морпорт", "Жанаозен", "Бейнеу"]
const TO_OPTIONS   = ["Туркменбаши, TM", "Баку (Алят), AZ", "Амирабад, IR"]

export function EndToEnd() {
  return (
    <section className="py-24 px-4 lg:px-6 bg-muted/30">
      <div className="mx-auto max-w-6xl">

        {/* Top: title + route widget */}
        <div className="grid items-start gap-10 lg:grid-cols-2 mb-12">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="pt-2"
          >
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-orange-500">Полный контроль</p>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.6rem] lg:leading-[1.15]">
              Сквозное управление
              <br />
              цепочкой поставок
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
              Один интерфейс от заявки до акта приёмки. Паром, маршрут, документы — всё в реальном времени, без звонков и таблиц.
            </p>
          </motion.div>

          {/* Right — route calculator card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.15 }}
          >
            <div
              className="rounded-2xl bg-card p-6 shadow-lg"
              style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.10)" }}
            >
              <p className="mb-5 text-sm font-semibold">Найти паромный рейс</p>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Откуда</label>
                  <div className="relative">
                    <select className="w-full appearance-none rounded-xl border bg-background py-3 pl-4 pr-10 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/30">
                      {FROM_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Куда</label>
                  <div className="relative">
                    <select className="w-full appearance-none rounded-xl border bg-background py-3 pl-4 pr-10 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/30">
                      {TO_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-muted-foreground" />
                  </div>
                </div>

                <Button asChild className="mt-1 gap-2 rounded-xl w-full" size="lg">
                  <Link href="/login">
                    Подобрать рейс ИИ
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Photo grid */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="grid grid-cols-2 gap-4 lg:grid-cols-3"
          style={{ gridTemplateRows: "240px 240px" }}
        >
          {gridPhotos.map((p, i) => (
            <div
              key={p.alt}
              className={`relative overflow-hidden rounded-2xl ${p.span}`}
            >
              <img
                src={p.img}
                alt={p.alt}
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {p.overlay && (
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-sm font-semibold leading-snug text-white">{p.overlay}</p>
                </div>
              )}
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
