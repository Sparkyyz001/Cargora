"use client"

import { motion } from "motion/react"
import { FlowingMenu } from "@/components/flowing-menu"

const countries = [
  {
    link: "#",
    text: "Казахстан",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Baiterek_August.jpg/960px-Baiterek_August.jpg",
    imagePosition: "50% 15%",
  },
  {
    link: "#",
    text: "Туркменистан",
    image: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=960&h=600&q=80",
    imagePosition: "50% 50%",
  },
  {
    link: "#",
    text: "Азербайджан",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=960&h=600&q=80",
    imagePosition: "50% 50%",
  },
  {
    link: "#",
    text: "Иран",
    image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=960&h=600&q=80",
    imagePosition: "50% 50%",
  },
  {
    link: "#",
    text: "Россия",
    image: "https://images.unsplash.com/photo-1547448415-e9f5b28e570d?auto=format&fit=crop&w=960&h=600&q=80",
    imagePosition: "50% 50%",
  },
  {
    link: "#",
    text: "Китай (ТМТМ)",
    image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=960&h=600&q=80",
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
          Маршруты через Каспий
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lp-display mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
        >
          5 стран Каспийского региона —{" "}
          <br className="hidden sm:block" />
          один сервис
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-4 text-muted-foreground text-base max-w-xl mx-auto"
        >
          KZ · TM · AZ · IR · RU — плюс коридор ТМТМ до Китая и Европы
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
