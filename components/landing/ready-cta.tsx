"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ArrowRight } from "lucide-react"

const TILES = [
  { top: 8,   left: 58, w: 74,  h: 74,  img: "https://images.unsplash.com/photo-1778629794381-d3ae4a54311c?auto=format&fit=crop&w=200&h=200&q=80", color: undefined, radius: 16 },
  { top: 0,   left: 30, w: 56,  h: 56,  img: undefined, color: "var(--primary)", radius: 14 },
  { top: 96,  left: 22, w: 120, h: 86,  img: "https://images.unsplash.com/photo-1759354017689-cf8b886b9f41?auto=format&fit=crop&w=300&h=220&q=80", color: undefined, radius: 18 },
  { top: 108, left: 70, w: 64,  h: 64,  img: undefined, color: "var(--accent)", radius: 14 },
  { top: 184, left: 10, w: 96,  h: 72,  img: "https://images.unsplash.com/photo-1774116196662-a9e1e4fa1612?auto=format&fit=crop&w=260&h=200&q=80", color: undefined, radius: 16 },
  { top: 176, left: 66, w: 110, h: 84,  img: "https://images.unsplash.com/photo-1759272840538-ae4b07214c71?auto=format&fit=crop&w=280&h=220&q=80", color: undefined, radius: 18 },
]

const ease = [0.16, 1, 0.3, 1] as const

export function ReadyCta() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_1fr]">

          {/* Left — text */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease }}
          >
            <h2 className="lp-display text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
              Готовы переосмыслить
              <br />
              логистику Каспия?
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              Присоединяйтесь к перевозчикам и грузоотправителям региона. Получите персонализированный план под ваши маршруты, объёмы и сроки.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
              >
                Начать бесплатно
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                Войти в систему
              </Link>
            </div>
          </motion.div>

          {/* Right — scattered tiles */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease, delay: 0.1 }}
            className="relative h-[290px]"
          >
            {TILES.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease, delay: 0.05 + i * 0.07 }}
                className="absolute overflow-hidden shadow-sm"
                style={{
                  top: t.top,
                  left: `${t.left}%`,
                  width: t.w,
                  height: t.h,
                  borderRadius: t.radius,
                  background: t.color ?? "var(--muted)",
                }}
              >
                {t.img && (
                  <img src={t.img} alt="" className="h-full w-full object-cover" />
                )}
              </motion.div>
            ))}
          </motion.div>

        </div>
      </div>
    </section>
  )
}
