"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { Check } from "lucide-react"

const PLANS = [
  {
    id: "sender",
    name: "Грузоотправитель",
    role: "Нефтяные компании, трейдеры, экспортёры",
    price: "27 000",
    period: "₸ / мес",
    dark: true,
    popular: false,
    cta: "Начать бесплатно",
    href: "/register",
    features: [
      "Создание заявок на перевозку",
      "ИИ-подбор оптимального рейса",
      "Трекинг груза в реальном времени",
      "Уведомления об изменении статуса",
      "Доступ к 6 паромным маршрутам",
      "История отправлений и документы",
    ],
  },
  {
    id: "carrier",
    name: "Перевозчик",
    role: "Судоходные компании и автоперевозчики",
    price: "50 000",
    period: "₸ / мес",
    dark: false,
    popular: true,
    cta: "Подключить флот",
    href: "/register",
    features: [
      "Все входящие заявки на груз",
      "Управление флотом и рейсами",
      "Диспетчерская доска реального времени",
      "Аналитика по доходности рейсов",
      "Приоритетная поддержка 24/7",
      "Назначение операторов и рейсов",
    ],
  },
  {
    id: "enterprise",
    name: "Корпоративный",
    role: "Крупные операторы и портовые структуры",
    price: "По запросу",
    period: "",
    dark: true,
    popular: false,
    cta: "Написать нам",
    href: "/faq",
    features: [
      "Всё из тарифа Перевозчик",
      "Персональный менеджер",
      "Интеграция с вашей ERP / TMS",
      "SLA 99.9% — гарантия доступности",
      "Кастомная аналитика и отчёты",
      "White-label решение",
    ],
  },
]

const ease = [0.16, 1, 0.3, 1] as const

export function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden bg-sidebar py-20 md:py-28">

      {/* Glow orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/4 rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(194,87,26,0.12) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6">

        {/* Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease }}
            className="text-sm font-medium uppercase tracking-widest text-sidebar-foreground/50"
          >
            Тарифы
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.07, ease }}
            className="mt-3 font-dm-serif text-4xl text-sidebar-foreground sm:text-5xl"
          >
            Простые и прозрачные
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.14, ease }}
            className="mt-4 text-base leading-relaxed text-sidebar-foreground/55"
          >
            Без скрытых комиссий — только фиксированная подписка.
            Платите за то, что нужно вашему бизнесу.
          </motion.p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1, ease }}
              className={[
                "relative flex flex-col overflow-hidden rounded-3xl p-8",
                plan.popular
                  ? "bg-sidebar-foreground text-sidebar shadow-2xl md:scale-[1.055]"
                  : "border border-white/8 bg-white/4 text-sidebar-foreground backdrop-blur-sm",
              ].join(" ")}
            >
              {/* Popular badge */}
              {plan.popular && (
                <span className="absolute right-7 top-7 inline-flex items-center rounded-full border border-sidebar/20 bg-sidebar px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground">
                  Популярный
                </span>
              )}

              {/* Plan name & role */}
              <div className="mb-7">
                <h3 className={[
                  "font-dm-serif text-2xl",
                  plan.popular ? "text-sidebar" : "text-sidebar-foreground",
                ].join(" ")}>
                  {plan.name}
                </h3>
                <p className={[
                  "mt-1.5 text-sm",
                  plan.popular ? "text-sidebar/60" : "text-sidebar-foreground/50",
                ].join(" ")}>
                  {plan.role}
                </p>
              </div>

              {/* Price */}
              <div className="mb-8 border-b pb-8 border-current/10">
                <div className="flex items-baseline gap-1.5">
                  <span className={[
                    "font-dm-serif text-5xl leading-none",
                    plan.popular ? "text-sidebar" : "text-sidebar-foreground",
                  ].join(" ")}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={[
                      "mb-1 self-end text-sm",
                      plan.popular ? "text-sidebar/55" : "text-sidebar-foreground/45",
                    ].join(" ")}>
                      {plan.period}
                    </span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="mb-8 flex flex-1 flex-col gap-3.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check
                      className={[
                        "mt-0.5 size-4 shrink-0",
                        plan.popular ? "text-primary" : "text-primary/80",
                      ].join(" ")}
                      strokeWidth={2.5}
                    />
                    <span className={[
                      "text-sm leading-snug",
                      plan.popular ? "text-sidebar/75" : "text-sidebar-foreground/70",
                    ].join(" ")}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              <Link
                href={plan.href}
                className={[
                  "block w-full rounded-full py-3 text-center text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0",
                  plan.popular
                    ? "bg-sidebar text-sidebar-foreground hover:bg-sidebar/90"
                    : "border border-white/15 bg-white/8 text-sidebar-foreground hover:bg-white/14",
                ].join(" ")}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-12 text-center text-sm text-sidebar-foreground/35"
        >
          Все тарифы включают техническую поддержку и обновления платформы.{" "}
          <Link href="/faq" className="text-sidebar-foreground/55 underline underline-offset-2 hover:text-sidebar-foreground transition-colors">
            Подробнее об условиях
          </Link>
        </motion.p>

      </div>
    </section>
  )
}
