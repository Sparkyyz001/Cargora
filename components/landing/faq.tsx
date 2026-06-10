"use client"

import * as React from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    q: "Сколько времени занимает подключение?",
    a: "Большинство компаний запускаются за 15 минут. Создайте аккаунт, добавьте сотрудников и начните вносить заказы — всё интуитивно понятно.",
  },
  {
    q: "Можно ли добавить всю команду диспетчеров?",
    a: "Да. На тарифах «Перевозчик» и «Корпоративный» количество диспетчеров не ограничено. Доступны роли: администратор, диспетчер, бухгалтер.",
  },
  {
    q: "Насколько защищены наши данные?",
    a: "Все данные хранятся в зашифрованном виде и передаются только по HTTPS. На корпоративном тарифе доступны SSO, журнал аудита и индивидуальное SLA.",
  },
  {
    q: "Есть ли пробный период?",
    a: "Да, каждый платный тариф включает 14 дней бесплатного использования. Карта не нужна.",
  },
  {
    q: "Можно ли интегрировать с 1С или другими системами?",
    a: "Да, мы предоставляем REST API и готовые интеграции с 1С:Предприятие, МойСклад и популярными CRM-системами.",
  },
]

function GradientCta() {
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      className="c5-animated-gradient flex flex-col items-center justify-center rounded-[24px] px-10 py-20 text-center text-white"
      style={{ boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)" }}
    >
      <h2
        className="mb-[15px] font-semibold leading-[1.1] text-[2.5rem] sm:text-[3rem] lg:text-[3.5rem]"
        style={{ letterSpacing: "-0.03em", textShadow: "0 4px 30px rgba(0,0,0,0.22)" }}
      >
        Готовы расти
        <br />
        быстрее рынка?
      </h2>
      <p
        className="mb-[30px] max-w-sm text-[0.9rem] font-normal opacity-90"
        style={{ textShadow: "0 2px 16px rgba(0,0,0,0.18)" }}
      >
        Заказы, автопарк и маршруты — в одной платформе, под контролем в реальном времени
      </p>
      <Link
        href="/login"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="cursor-pointer border-none text-[0.95rem] font-semibold text-white no-underline transition-all duration-200 hover:-translate-y-0.5"
        style={{
          background: "#171717",
          padding: "14px 32px",
          borderRadius: "12px",
          boxShadow: hovered ? "0 14px 30px rgba(0,0,0,0.4)" : "0 10px 20px rgba(0,0,0,0.3)",
        }}
      >
        Начать бесплатно
      </Link>
    </div>
  )
}

function FaqAccordion() {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(0)

  const toggle = (index: number) => {
    setActiveIndex((current) => (current === index ? null : index))
  }

  return (
    <div className="flex flex-col justify-center gap-3">
      {faqs.map((item, index) => {
        const active = activeIndex === index
        return (
          <div
            key={item.q}
            onClick={() => toggle(index)}
            className={`cursor-pointer rounded-[10px] border bg-card px-5 py-[18px] transition-all duration-200 hover:border-foreground/15 ${
              active ? "border-foreground/15" : "border-border"
            }`}
            style={{
              boxShadow: active ? "0 4px 12px rgba(0,0,0,0.06)" : "0 2px 8px rgba(0,0,0,0.03)",
            }}
          >
            <div className="flex items-center justify-between gap-4 text-[0.9rem] font-normal text-foreground">
              <span>{item.q}</span>
              <motion.span
                animate={{ rotate: active ? 180 : 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="shrink-0 text-muted-foreground"
              >
                <ChevronDown size={20} />
              </motion.span>
            </div>
            <AnimatePresence initial={false}>
              {active && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className="pt-3 text-[0.9rem] leading-[1.6] text-muted-foreground">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

export function Faq() {
  return (
    <section id="faq" className="py-20 max-[900px]:py-[60px]">
      <div className="mx-auto w-full max-w-[1100px] px-4 lg:px-6">
        <div className="grid grid-cols-[1.6fr_1fr] items-stretch gap-[30px] max-[900px]:grid-cols-1 max-[900px]:gap-[60px]">
          <GradientCta />
          <FaqAccordion />
        </div>
      </div>
    </section>
  )
}
