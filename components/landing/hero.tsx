"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
}
const item = {
  hidden: { y: 24, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: "easeOut" as const } },
}

export function Hero() {
  return (
    <section className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden pb-16 pt-20">

      {/* Фоновое видео */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover"
        src="/ferry-bg.mp4"
      />

      {/* Тёмный градиент поверх видео — текст читается чётко */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.65) 100%)" }}
      />

      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mx-auto flex max-w-3xl flex-col items-center text-center"
        >
          <motion.h1
            variants={item}
            className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-[3.8rem] lg:leading-[1.1]"
          >
            Управляй движением.{" "}
            <span className="text-[#f97316]">Не хаосом.</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg"
          >
            Заказы, маршруты, автопарк и аналитика в одной панели. Контролируйте
            доставки в реальном времени — без хаоса и лишних таблиц.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="group">
              <Link href="/login">
                Начать бесплатно
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="#features">Как это работает</Link>
            </Button>
          </motion.div>
        </motion.div>

      </div>

      {/* Переход от тёмного героя к светлым секциям */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }}
      />
    </section>
  )
}
