"use client"

import * as React from "react"
import Link from "next/link"
import { Send, MessageCircle, Mail, Phone, Globe } from "lucide-react"
import { IconTruckDelivery } from "@tabler/icons-react"

// Ссылки в публичном футере ведут только на разделы лендинга и /login —
// раздел /dashboard защищён middleware и не должен светиться в маркетинговой навигации
// (гость не должен попадать в кабинет в обход регистрации/входа).
const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Платформа",
    links: [
      { label: "Сервисы", href: "/#services" },
      { label: "Маршруты и порты", href: "/#solutions" },
      { label: "Как это работает", href: "/#how-it-works" },
      { label: "Частые вопросы", href: "/faq" },
      { label: "Войти в кабинет", href: "/login" },
    ],
  },
  {
    title: "Компания",
    links: [
      { label: "О платформе", href: "/faq" },
      { label: "Истории клиентов", href: "/#reviews" },
      { label: "Начать бесплатно", href: "/register" },
      { label: "Связаться с нами", href: "/faq" },
    ],
  },
  {
    title: "Поддержка",
    links: [
      { label: "FAQ и документация", href: "/faq" },
      { label: "Конфиденциальность", href: "/privacy" },
      { label: "Условия использования", href: "/terms" },
      { label: "support@cargora.kz", href: "mailto:support@cargora.kz" },
    ],
  },
]

const CONTACT_CHANNELS = [
  { Icon: Send, label: "Telegram" },
  { Icon: MessageCircle, label: "WhatsApp" },
  { Icon: Mail, label: "Email" },
  { Icon: Phone, label: "Звонок" },
  { Icon: Globe, label: "Сайт" },
]

// Фоновое видео весит ~40 МБ — грузим и декодируем его только когда секция
// почти показалась на экране, и ставим на паузу, когда она уходит из вьюпорта.
// Так оно не конкурирует за полосу пропускания с первым экраном и не грузит GPU впустую.
function FooterBackgroundVideo() {
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!video.src) {
            video.src = "/auth-bg.mp4"
            video.load()
          }
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { rootMargin: "300px 0px" }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <video
      ref={videoRef}
      loop
      muted
      playsInline
      preload="none"
      className="absolute inset-0 z-0 h-full w-full object-cover"
    />
  )
}

export function Footer() {
  return (
    <>
      {/* Иммерсивная секция футера: видео-фон автопарка в движении + "liquid glass" карточка поверх */}
      <section className="relative w-full overflow-hidden">
        <FooterBackgroundVideo />
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-slate-950/75 via-slate-950/65 to-slate-950/90" />
        {/* Плавная растушёвка сверху — секция "вырастает" из фона страницы, без резкого реза по видео */}
        <div className="absolute inset-x-0 top-0 z-[2] h-40 bg-gradient-to-b from-background to-transparent md:h-64" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 lg:px-6 lg:py-24">
          <footer className="liquid-glass w-full rounded-3xl p-6 text-white/70 md:p-10">
            <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12">
              {/* Бренд */}
              <div className="md:col-span-5">
                <div className="flex items-center gap-2 text-white">
                  <IconTruckDelivery className="size-6" />
                  <span className="font-display text-xl tracking-tight">Cargora</span>
                </div>
                <p className="mt-4 max-w-sm text-sm leading-relaxed">
                  Cargora объединяет заказы, автопарк, маршруты и аналитику в одной платформе —
                  прозрачная логистика и доставка «от двери до двери» в реальном времени, без
                  Excel-таблиц и звонков «а где сейчас машина».
                </p>
              </div>

              {/* Ссылки */}
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 md:col-span-7">
                {FOOTER_COLUMNS.map((column) => (
                  <div key={column.title}>
                    <p className="mb-4 text-sm font-medium uppercase tracking-wider text-white">
                      {column.title}
                    </p>
                    <ul className="space-y-2 text-xs">
                      {column.links.map((link) => (
                        <li key={link.label}>
                          <Link href={link.href} className="transition-colors hover:text-white">
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Нижняя плашка */}
            <div className="flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-6 md:flex-row md:gap-4">
              <p className="text-[10px] uppercase tracking-widest opacity-50">
                © {new Date().getFullYear()} Cargora — логистика в реальном времени
              </p>
              <div className="flex items-center gap-4">
                <span className="text-[10px] uppercase tracking-widest opacity-50">Будьте на связи:</span>
                <div className="flex items-center gap-3">
                  {CONTACT_CHANNELS.map(({ Icon, label }) => (
                    <a
                      key={label}
                      href="#"
                      aria-label={label}
                      className="opacity-70 transition-colors hover:text-white hover:opacity-100"
                    >
                      <Icon size={16} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </footer>
        </div>
      </section>
    </>
  )
}
