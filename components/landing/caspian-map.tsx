"use client"

import { motion } from "motion/react"

const EMBED_URL =
  "https://www.marinetraffic.com/en/ais/embed/zoom:7/centery:41/centerx:51/maptype:4/shownames:false/mmsi:0/shipid:0/fleet:/fleet_id:/vtypes:/showmenu:/remember:false"

export function CaspianMap() {
  return (
    <section id="live-map" className="bg-background py-16 md:py-24 px-6 md:px-12 lg:px-[120px]">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-10 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Онлайн-карта
            </p>
            <h2 className="mt-2 font-dm-serif text-3xl text-foreground sm:text-4xl">
              Суда Каспийского моря — прямо сейчас
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-sm text-sm text-muted-foreground md:text-right"
          >
            Данные АИС в реальном времени. Нажмите на судно,
            чтобы увидеть детали рейса.
          </motion.p>
        </div>

        {/* Map frame */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative overflow-hidden rounded-2xl border border-border shadow-lg"
          style={{ aspectRatio: "16 / 7" }}
        >
          <iframe
            src={EMBED_URL}
            className="absolute inset-0 h-full w-full"
            allowFullScreen
            loading="lazy"
            title="Онлайн-карта судов Каспийского моря — MarineTraffic"
          />
        </motion.div>

        {/* Source note */}
        <p className="mt-3 text-center text-xs text-muted-foreground/50">
          Источник данных:{" "}
          <a
            href="https://www.marinetraffic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            MarineTraffic.com
          </a>
          {" "}— АИС-транспондеры коммерческих судов
        </p>

      </div>
    </section>
  )
}
