"use client"

import { motion } from "motion/react"
import { FlowingMenu } from "@/components/flowing-menu"

// Ключевые направления области вместо списка стран: кейс про перевозки
// ВНУТРИ региона, международные коридоры здесь неуместны.
const countries = [
  {
    link: "#",
    text: "Актау",
    image: "/photos/chalk-plateau.jpg",
    imagePosition: "50% 50%",
  },
  {
    link: "#",
    text: "Жанаозен",
    image: "/photos/steppe-road.jpg",
    imagePosition: "50% 50%",
  },
  {
    link: "#",
    text: "Шетпе",
    image: "/photos/lone-truck.jpg",
    imagePosition: "50% 50%",
  },
  {
    link: "#",
    text: "Курык",
    image: "/photos/truck-sunset.jpg",
    imagePosition: "50% 50%",
  },
  {
    link: "#",
    text: "Форт-Шевченко",
    image: "/photos/box-truck.jpg",
    imagePosition: "50% 50%",
  },
  {
    link: "#",
    text: "Бейнеу",
    image: "/photos/warehouse.jpg",
    imagePosition: "50% 50%",
  },
]

export function LogoCloud() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1200px] px-6 pt-12 pb-8 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Направления по области
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lp-display mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
        >
          15 населённых пунктов —{" "}
          <br className="hidden sm:block" />
          одна платформа
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-4 text-muted-foreground text-base max-w-xl mx-auto"
        >
          Актау · Жанаозен · Шетпе · Курык · Форт-Шевченко · Бейнеу и отдалённые посёлки
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        style={{ height: "420px", position: "relative" }}
      >
        <FlowingMenu
          items={countries}
          speed={18}
          textColor="#faf4ec"
          bgColor="#2f231d"
          marqueeBgColor="#c55123"
          marqueeTextColor="#fffdf7"
          borderColor="rgba(250,244,236,0.12)"
        />
      </motion.div>
    </section>
  )
}
