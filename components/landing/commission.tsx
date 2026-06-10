"use client"

import { motion } from "motion/react"
import { Check, X } from "lucide-react"

const comparison = [
  { label: "Абонентская плата",     old: true,  cargora: false },
  { label: "Плата за каждый заказ", old: true,  cargora: false },
  { label: "Скрытые комиссии",      old: true,  cargora: false },
  { label: "Только за доставку",    old: false, cargora: true  },
  { label: "Нет груза — нет платы", old: false, cargora: true  },
  { label: "Прозрачный расчёт",     old: false, cargora: true  },
]

const examples = [
  { cargo: "Нефтепродукты",  deal: 50_000  },
  { cargo: "Контейнер ТМТМ", deal: 120_000 },
  { cargo: "Металлопрокат",  deal: 85_000  },
]

export function Commission() {
  return (
    <section id="pricing" className="overflow-hidden py-24 px-4 lg:px-6">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="mx-auto max-w-2xl text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium mb-5">
            <span className="size-2 rounded-full bg-green-500" style={{ boxShadow: "0 0 6px rgba(34,197,94,0.7)" }} />
            Честная модель
          </div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Платите только за результат
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            Cargora зарабатывает, когда зарабатываете вы.
            Никаких подписок — только{" "}
            <span className="font-semibold text-foreground">2% с каждого доставленного груза.</span>
          </p>
        </motion.div>

        {/* Main block */}
        <div className="grid gap-8 lg:grid-cols-2 items-start mb-16">

          {/* Left — big 2% */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
          >
            <div
              className="relative flex flex-col items-center justify-center rounded-3xl px-12 py-14 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(249,115,22,0.03) 100%)",
                border: "1px solid rgba(249,115,22,0.2)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-3xl"
                style={{ background: "radial-gradient(circle at 50% 0%, rgba(249,115,22,0.12) 0%, transparent 60%)" }}
              />
              <p
                className="text-8xl font-bold tracking-tighter"
                style={{ color: "#f97316", textShadow: "0 0 40px rgba(249,115,22,0.3)" }}
              >
                2%
              </p>
              <p className="mt-3 text-base font-medium">с каждой сделки</p>
              <p className="mt-1 text-sm text-muted-foreground">только за доставленный груз</p>

              <div className="mt-8 flex flex-col gap-2 w-full">
                {examples.map((ex) => (
                  <div
                    key={ex.cargo}
                    className="flex items-center justify-between rounded-xl bg-background/60 px-4 py-2.5 text-sm"
                  >
                    <span className="text-muted-foreground">{ex.cargo}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">${ex.deal.toLocaleString()}</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        +${(ex.deal * 0.02).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">сделка → комиссия Cargora</p>
            </div>
          </motion.div>

          {/* Right — comparison */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.2 }}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b">
              <span>Условие</span>
              <span className="text-center">Традиционно</span>
              <span className="text-center text-foreground">Cargora</span>
            </div>

            {comparison.map((row, i) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.25 + i * 0.07 }}
                className="grid grid-cols-3 items-center py-3 border-b border-border/50 last:border-0"
              >
                <span className="text-sm">{row.label}</span>
                <span className="flex justify-center">
                  {row.old ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-red-500/10">
                      <Check className="size-3.5 text-red-500" />
                    </span>
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted">
                      <X className="size-3.5 text-muted-foreground/40" />
                    </span>
                  )}
                </span>
                <span className="flex justify-center">
                  {row.cargora ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-green-500/15">
                      <Check className="size-3.5 text-green-600" />
                    </span>
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted">
                      <X className="size-3.5 text-muted-foreground/40" />
                    </span>
                  )}
                </span>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="mt-2 rounded-2xl border border-green-500/20 bg-green-500/5 p-5"
            >
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                Как Uber — только для моря
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                Порт Актау обрабатывает 12 млн тонн в год. При 1% охвата — это{" "}
                <span className="font-semibold text-foreground">$1.9M выручки Cargora</span>{" "}
                без единой абонентской платы.
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom steps */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Груз в пути",
              desc: "Отправитель создаёт заказ, ИИ подбирает паром. Перевозчик принимает заявку одним нажатием.",
            },
            {
              step: "02",
              title: "Паром прибыл",
              desc: "Груз доставлен в порт назначения, акт подписан, статус обновляется автоматически.",
            },
            {
              step: "03",
              title: "2% — и всё",
              desc: "Cargora списывает 2% от суммы сделки. Нет доставки — нет комиссии. Точка.",
            },
          ].map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative overflow-hidden rounded-2xl border bg-card p-6"
            >
              <span
                className="absolute right-4 top-3 text-5xl font-black leading-none tracking-tighter select-none"
                style={{ color: "rgba(249,115,22,0.07)" }}
              >
                {s.step}
              </span>
              <p className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-3">
                Шаг {s.step}
              </p>
              <p className="font-semibold mb-2">{s.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
