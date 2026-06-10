"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Star, Quote } from "lucide-react"

const PEOPLE = [
  {
    name: "Ерлан Сейткали",
    role: "Директор по логистике, КазМунайТранс",
    img: "https://images.unsplash.com/photo-1661688797823-36e97735223e?auto=format&fit=crop&w=300&h=300&q=80",
    quote:
      "Платформа Cargora полностью изменила наш подход к паромным отправкам. ИИ подбирает рейс за секунды, карточка заявки появляется на телефоне перевозчика мгновенно — мы экономим по 3-4 часа на каждой партии груза.",
  },
  {
    name: "Асет Нуров",
    role: "Начальник грузового отдела, Актауский МТП",
    img: "https://images.unsplash.com/photo-1758599543242-31567fb8766e?auto=format&fit=crop&w=300&h=300&q=80",
    quote:
      "Видимость груза в реальном времени через Каспий изменила то, как мы планируем. Мы наконец можем называть точные даты и уверенно их выдерживать — квартал за кварталом.",
  },
  {
    name: "Данияр Алиев",
    role: "Логист, ТМТМ Трейдинг",
    img: "https://images.unsplash.com/photo-1758518729314-b02874db8c37?auto=format&fit=crop&w=300&h=300&q=80",
    quote:
      "Мы масштабировались с 5 до 40 контейнеров в месяц, не увеличивая штат логистики. Cargora берёт на себя всю сложность — мы фокусируемся на росте бизнеса.",
  },
]

const LOGOS = ["Актауский МТП", "ТМТМ Corridor", "КазМунайГаз", "NCX Cargo", "QazaqGaz", "Tengizchevroil"]

const ease = [0.16, 1, 0.3, 1] as const

export function Testimonials() {
  const [active, setActive] = useState(0)
  const person = PEOPLE[active]

  return (
    <section id="reviews" className="bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="rounded-[32px] bg-sidebar px-8 py-12 text-sidebar-foreground sm:px-12"
        >
          {/* Header row */}
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <p className="max-w-[200px] text-sm leading-relaxed text-sidebar-foreground/60">
              Клиенты доверяют нам надёжную и эффективную логистику через Каспий.
            </p>
            <h2 className="lp-display max-w-md text-4xl font-extrabold leading-tight tracking-tight text-sidebar-foreground">
              Что говорят
              наши клиенты
            </h2>
            <div className="flex gap-2 items-center">
              {PEOPLE.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={
                    "h-2.5 rounded-full transition-all duration-300 " +
                    (i === active ? "w-7 bg-sidebar-foreground" : "w-2.5 bg-sidebar-foreground/30")
                  }
                  aria-label={`Отзыв ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr]">

            {/* Photos strip + featured */}
            <div className="flex items-end gap-5">
              <div className="hidden gap-3 sm:flex">
                {PEOPLE.map((p, i) => (
                  <button
                    key={p.name}
                    onClick={() => setActive(i)}
                    className={
                      "h-20 w-16 overflow-hidden rounded-2xl transition-all duration-300 " +
                      (i === active ? "opacity-100 ring-2 ring-sidebar-foreground" : "opacity-40 hover:opacity-60")
                    }
                  >
                    <img src={p.img} alt={p.name} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease }}
                >
                  <div className="h-56 w-44 overflow-hidden rounded-3xl">
                    <img src={person.img} alt={person.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="lp-display mt-4 text-lg font-bold text-sidebar-foreground">{person.name}</div>
                  <div className="text-sm text-sidebar-foreground/60">{person.role}</div>
                  <div className="mt-2 flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Quote */}
            <div className="flex flex-col justify-center">
              <Quote className="h-12 w-12 text-sidebar-foreground/15" strokeWidth={1.5} />
              <AnimatePresence mode="wait">
                <motion.p
                  key={active}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease }}
                  className="mt-4 text-xl leading-relaxed text-sidebar-foreground/90"
                >
                  {person.quote}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Logo strip */}
          <div className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-sidebar-foreground/10 pt-10">
            {LOGOS.map((l) => (
              <span
                key={l}
                className="lp-display text-sm font-bold uppercase tracking-widest text-sidebar-foreground/30 transition-colors hover:text-sidebar-foreground/60"
              >
                {l}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
