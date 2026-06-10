"use client"

import { motion } from "motion/react"
import { FileText, PackageCheck, Ship, MapPin } from "lucide-react"

const STEPS = [
  {
    no: "01",
    Icon: FileText,
    title: "Создать заявку",
    desc: "Выберите режим: паромный или сухопутный. Укажите маршрут, вес и сроки — оценка за минуту.",
  },
  {
    no: "02",
    Icon: PackageCheck,
    title: "ИИ подбирает маршрут",
    desc: "Для паромов — анализ расписания 5 судов. Для авто — подбор перевозчика по трассе и дате.",
  },
  {
    no: "03",
    Icon: Ship,
    title: "Груз в движении",
    desc: "Паром через Каспий или фура по трассе — отслеживайте каждый этап в реальном времени.",
  },
  {
    no: "04",
    Icon: MapPin,
    title: "Груз доставлен",
    desc: "Последняя миля, таможня оформлена, акт приёмки подтверждён в платформе.",
  },
]

const ease = [0.16, 1, 0.3, 1] as const

export function LpProcess() {
  return (
    <section id="how-it-works" className="bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="rounded-[32px] bg-card lp-texture px-8 py-12 sm:px-12 border border-border"
          style={{ boxShadow: "0 24px 48px -24px rgba(14,17,20,0.1)" }}
        >
          <div className="mb-10 max-w-xl">
            <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Как это работает
            </span>
            <h2 className="lp-display mt-3 text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
              От заявки до доставки
              <br />
              за четыре шага
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.no}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease, delay: i * 0.08 }}
                className="group bg-card p-7 transition-colors hover:bg-muted"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground text-background transition-colors group-hover:bg-primary">
                    <s.Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <span className="lp-display text-4xl font-extrabold tracking-tight text-border">
                    {s.no}
                  </span>
                </div>
                <h3 className="lp-display mt-6 text-lg font-bold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
