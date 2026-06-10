"use client"

import { motion } from "motion/react"

const stats = [
  {
    value: "12 млн т",
    label: "Грузооборот порта Актау в год",
    sub: "Крупнейший порт Казахстана",
  },
  {
    value: "4 страны",
    label: "Каспийский коридор",
    sub: "KZ · TM · AZ · IR",
  },
  {
    value: "14 часов",
    label: "Актау → Туркменбаши",
    sub: "Быстрейший паромный рейс",
  },
  {
    value: "×4",
    label: "Рост грузопотока ТМТМ",
    sub: "За последние 4 года",
  },
]

export function Stats() {
  return (
    <section id="workflow" className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl font-bold tracking-tight lg:text-5xl">
                {s.value}
              </div>
              <div className="mt-2 text-sm font-medium text-primary-foreground/90">
                {s.label}
              </div>
              <div className="mt-1 text-xs text-primary-foreground/50">
                {s.sub}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
