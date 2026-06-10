"use client"

import * as React from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import {
  ChevronDown, Send, Ship, CreditCard, ShieldCheck,
  BarChart3, Users, Zap, Mail, MessageCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Navbar1 } from "@/components/ui/navbar1"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// ─── Data ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "Паромные рейсы",  icon: Ship,        color: "text-sky-500",    bg: "bg-sky-500/10"    },
  { id: "Тарифы и оплата", icon: CreditCard,  color: "text-green-500",  bg: "bg-green-500/10"  },
  { id: "Безопасность",    icon: ShieldCheck, color: "text-violet-500", bg: "bg-violet-500/10" },
  { id: "Платформа",       icon: BarChart3,   color: "text-orange-500", bg: "bg-orange-500/10" },
  { id: "Перевозчикам",    icon: Users,       color: "text-rose-500",   bg: "bg-rose-500/10"   },
  { id: "Интеграции",      icon: Zap,         color: "text-amber-500",  bg: "bg-amber-500/10"  },
]

const FAQS = [
  // Паромные рейсы
  { cat: "Паромные рейсы",
    q: "Какие маршруты доступны через Cargora?",
    a: "Актау → Туркменбаши, Актау → Баку (порт Алят) и Актау → Амирабад (Иран). Все рейсы из порта Актау, Мангистауская область. Расписание и свободные места обновляются в реальном времени." },
  { cat: "Паромные рейсы",
    q: "Сколько времени занимает паромный рейс?",
    a: "Актау → Туркменбаши: ~14 часов. Актау → Баку (Алят): ~2 суток. Актау → Амирабад: ~3 суток. Время указано при нормальных погодных условиях на Каспии." },
  { cat: "Паромные рейсы",
    q: "Что такое TEU и как рассчитывается вместимость?",
    a: "TEU (Twenty-foot Equivalent Unit) — стандартная единица объёма контейнера: примерно 20 тонн. ИИ Cargora автоматически рассчитывает нужное количество TEU по весу и объёму вашего груза." },
  { cat: "Паромные рейсы",
    q: "Как ИИ подбирает оптимальный паром?",
    a: "Анализирует тип груза, вес, объём, порт назначения, дату отправки и свободные места. Выбирает рейс с лучшим соотношением цены и скорости, объясняет решение на русском языке." },
  { cat: "Паромные рейсы",
    q: "Можно ли отслеживать судно в реальном времени?",
    a: "Да. На карте маршрутов каждый паром отображён анимированным маркером с расчётным положением на Каспии на основе времени отплытия и хода судна." },
  // Тарифы
  { cat: "Тарифы и оплата",
    q: "Сколько стоит Cargora?",
    a: "Только 2% комиссии с каждого успешно завершённого рейса. Никаких подписок и абонентских платежей. Нет доставки — нет оплаты." },
  { cat: "Тарифы и оплата",
    q: "Когда списывается комиссия?",
    a: "Только после того, как груз доставлен и статус изменён на «Доставлен». Мы зарабатываем ровно тогда, когда зарабатываете вы." },
  { cat: "Тарифы и оплата",
    q: "Есть ли скрытые платежи или минимальная сумма?",
    a: "Нет. Никаких минимальных сумм, дополнительных комиссий или платы за платформу. Единственный платёж — 2% от суммы сделки после доставки." },
  // Безопасность
  { cat: "Безопасность",
    q: "Как защищены данные моей компании?",
    a: "Передача данных — только TLS/HTTPS. Хранение — зашифровано на инфраструктуре Supabase (SOC 2, ISO 27001). Доступ к вашим заказам имеют только авторизованные пользователи вашей организации." },
  { cat: "Безопасность",
    q: "Кто может видеть мои заказы?",
    a: "Только сотрудники, которых вы сами добавили в аккаунт. Cargora не передаёт данные о ваших грузах и маршрутах третьим лицам." },
  // Платформа
  { cat: "Платформа",
    q: "Нужно ли что-то устанавливать?",
    a: "Нет. Cargora работает полностью в браузере — на ноутбуке, планшете или телефоне. Диспетчерская страница специально оптимизирована для смартфона." },
  { cat: "Платформа",
    q: "Сколько времени занимает начало работы?",
    a: "Около 5 минут: создать аккаунт, войти в дашборд и создать первый заказ. Карта не нужна, демо-данные загружаются в один клик." },
  // Перевозчикам
  { cat: "Перевозчикам",
    q: "Как получать уведомления о новых грузах?",
    a: "Откройте «Диспетчерскую» в дашборде на телефоне. Когда отправитель создаёт заказ, приходит мгновенное уведомление — звук, вибрация, карточка груза. Принять или отклонить — одним нажатием." },
  { cat: "Перевозчикам",
    q: "Можно ли отклонить заявку?",
    a: "Да. В диспетчерской у каждой заявки есть кнопки «Принять» и «Отклонить». При отклонении заявка снимается с вашего экрана." },
  // Интеграции
  { cat: "Интеграции",
    q: "Есть ли API для подключения к нашей ERP?",
    a: "Да. Cargora предоставляет REST API для создания заказов, получения статусов и работы со справочниками. Документация доступна в личном кабинете." },
  { cat: "Интеграции",
    q: "Можно ли подключить 1С:Предприятие?",
    a: "Интеграция через REST API уже работает. Готовый модуль для 1С:Предприятие 8.3 в разработке. Напишите нам — поможем настроить под вашу конфигурацию." },
]

// ─── Sub-components ───────────────────────────────────────────────────────

function FaqItem({ q, a, delay = 0 }: { q: string; a: string; delay?: number }) {
  const [open, setOpen] = React.useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.38, delay }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-left rounded-2xl border bg-card px-6 py-5 transition-all duration-200
          hover:border-foreground/20 hover:shadow-sm
          ${open ? "border-foreground/20 shadow-sm" : "border-border"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <span className="text-sm font-medium leading-relaxed">{q}</span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.22 }}
            className="mt-0.5 shrink-0 text-muted-foreground"
          >
            <ChevronDown size={17} />
          </motion.span>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <p className="pt-4 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  )
}

function CategoryPill({
  cat,
  active,
  onClick,
}: {
  cat: (typeof CATEGORIES)[number]
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200
        ${active
          ? "border-transparent bg-foreground text-background shadow-sm"
          : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
        }`}
    >
      <cat.icon className={`size-3.5 ${active ? "opacity-100" : cat.color}`} />
      {cat.id}
    </button>
  )
}

function ContactForm() {
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    setLoading(false)
    setSent(true)
    toast.success("Заявка отправлена — свяжемся в течение часа")
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-5 py-12 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-500/15 text-3xl">✓</div>
        <div>
          <p className="text-lg font-semibold">Заявка принята!</p>
          <p className="mt-1 text-sm text-muted-foreground">Свяжемся с вами в течение одного рабочего часа.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSent(false)}>Отправить ещё один вопрос</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cf-name">Имя</Label>
          <Input id="cf-name" placeholder="Алибек Джаксыбеков" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cf-company">Компания</Label>
          <Input id="cf-company" placeholder="ТОО КазТрансПорт" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cf-email">Email</Label>
        <Input id="cf-email" type="email" placeholder="alibek@company.kz" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cf-phone">Телефон</Label>
        <Input id="cf-phone" type="tel" placeholder="+7 729 200 00 00" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cf-msg">Сообщение</Label>
        <textarea
          id="cf-msg"
          rows={4}
          placeholder="Расскажите о вашем грузе или задайте вопрос..."
          className="flex w-full resize-none rounded-xl border bg-transparent px-4 py-3 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:border-input dark:bg-input/30"
        />
      </div>
      <Button type="submit" disabled={loading} className="gap-2 self-start px-6">
        <Send className="size-4" />
        {loading ? "Отправка..." : "Отправить"}
      </Button>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function FaqPage() {
  const [active, setActive] = React.useState<string | null>(null)

  const grouped = active
    ? [{ cat: active, items: FAQS.filter((f) => f.cat === active) }]
    : CATEGORIES.map((c) => ({ cat: c.id, items: FAQS.filter((f) => f.cat === c.id) }))

  return (
    <div className="min-h-svh bg-background">
      <Navbar1 />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-36 pb-24 px-4 text-center">
        {/* Subtle orange glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% -5%, rgba(249,115,22,0.1) 0%, transparent 70%)" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium shadow-xs">
            <Ship className="size-3.5 text-orange-500" />
            Поддержка Cargora
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Часто задаваемые
            <br />
            <span className="text-orange-500">вопросы</span>
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            Всё о паромной логистике Каспия — от первого заказа до доставки груза.
          </p>

          {/* Mini stats */}
          <div className="mt-10 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <span><strong className="font-semibold text-foreground">{FAQS.length}</strong> вопросов</span>
            <span className="size-1 rounded-full bg-border" />
            <span><strong className="font-semibold text-foreground">6</strong> категорий</span>
            <span className="size-1 rounded-full bg-border" />
            <span>Ответ за <strong className="font-semibold text-foreground">1 час</strong></span>
          </div>
        </motion.div>
      </section>

      {/* ── Category filter ───────────────────────────────────────────── */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setActive(null)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200
                ${!active
                  ? "border-transparent bg-foreground text-background shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
                }`}
            >
              Все вопросы
            </button>
            {CATEGORIES.map((cat) => (
              <CategoryPill
                key={cat.id}
                cat={cat}
                active={active === cat.id}
                onClick={() => setActive(active === cat.id ? null : cat.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ accordion ─────────────────────────────────────────────── */}
      <section className="px-4 pb-32">
        <div className="mx-auto max-w-3xl space-y-14">
          <AnimatePresence mode="wait">
            {grouped.map(({ cat, items }) => {
              const catMeta = CATEGORIES.find((c) => c.id === cat)!
              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Category heading */}
                  <div className="mb-5 flex items-center gap-3">
                    <div className={`flex size-9 items-center justify-center rounded-xl ${catMeta.bg}`}>
                      <catMeta.icon className={`size-4.5 ${catMeta.color}`} />
                    </div>
                    <h2 className="text-base font-semibold tracking-tight">{cat}</h2>
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>

                  {/* Items */}
                  <div className="space-y-3">
                    {items.map((item, i) => (
                      <FaqItem key={item.q} q={item.q} a={item.a} delay={i * 0.05} />
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Contact ───────────────────────────────────────────────────── */}
      <section className="px-4 pb-32">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border bg-card">
          <div className="grid lg:grid-cols-[1fr_1.4fr]">

            {/* Left — info */}
            <div className="flex flex-col justify-between gap-10 p-10 lg:border-r">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-500">Связаться с нами</p>
                <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">
                  Остался вопрос?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Напишите нам — ответим в течение часа и поможем отправить первый груз через Каспий.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href="mailto:support@cargora.kz"
                  className="flex items-center gap-3 rounded-2xl border bg-background px-4 py-3.5 text-sm transition-colors hover:border-foreground/20"
                >
                  <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500/10">
                    <Mail className="size-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-xs text-muted-foreground">support@cargora.kz</p>
                  </div>
                </a>
                <a
                  href="https://t.me/cargora_support"
                  className="flex items-center gap-3 rounded-2xl border bg-background px-4 py-3.5 text-sm transition-colors hover:border-foreground/20"
                >
                  <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/10">
                    <MessageCircle className="size-4 text-sky-500" />
                  </div>
                  <div>
                    <p className="font-medium">Telegram</p>
                    <p className="text-xs text-muted-foreground">@cargora_support</p>
                  </div>
                </a>
              </div>

              <p className="text-xs text-muted-foreground">
                Пн–Пт 09:00–18:00 (GMT+5, Астана)
              </p>
            </div>

            {/* Right — form */}
            <div className="p-10">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────────────────────── */}
      <section className="px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mx-auto max-w-5xl"
        >
          <div
            className="c5-animated-gradient flex flex-col items-center justify-center rounded-3xl px-8 py-20 text-center text-white"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-widest opacity-70">Порт Актау · Каспийское море</p>
            <h2
              className="text-balance text-3xl font-bold sm:text-4xl lg:text-5xl"
              style={{ letterSpacing: "-0.02em", textShadow: "0 4px 24px rgba(0,0,0,0.2)" }}
            >
              Готовы отправить
              <br />
              первый груз?
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed opacity-80">
              Регистрация за 5 минут. ИИ подберёт паром, диспетчер примет заявку — всё онлайн.
            </p>
            <Link
              href="/register"
              className="mt-8 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-foreground shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
            >
              Начать бесплатно — это 2%
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
