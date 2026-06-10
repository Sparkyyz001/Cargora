"use client"

import { useRef, useEffect } from "react"
import { motion, useInView, animate } from "motion/react"

// ─── AnimatedCounter ──────────────────────────────────────────────────────────

function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
}: {
  value: number
  suffix?: string
  prefix?: string
  decimals?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-50px" })

  useEffect(() => {
    if (!inView || !ref.current) return
    animate(0, value, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate(val) {
        if (ref.current)
          ref.current.textContent = prefix + val.toFixed(decimals) + suffix
      },
    })
  }, [inView, value, suffix, prefix, decimals])

  return (
    <span ref={ref}>
      {prefix}0{suffix}
    </span>
  )
}

// ─── Typewriter ───────────────────────────────────────────────────────────────

function Typewriter({
  text,
  delay = 0,
  speed = 0.015,
  className = "",
}: {
  text: string
  delay?: number
  speed?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-10px" })

  return (
    <motion.span
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 1 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: speed, delayChildren: delay },
        },
      }}
      className={className}
    >
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  )
}

// ─── SVG mask (triangle shape) ────────────────────────────────────────────────

const SVG_MASK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='m53.54,45.42c2.19-3.79,7.67-3.79,9.86,0l4.54,7.87c1.17,2.02,1.17,4.51,0,6.54l-8.15,13.81c-1.68,2.91.42,6.55,3.78,6.55h17.81c3.45,0,5.61-3.74,3.89-6.73l-28.76-49.81c-2.95-5.12-10.34-5.12-13.29,0l-28.46,49.3c-1.86,3.22.46,7.24,4.18,7.24h10.23c2.55,0,4.91-1.36,6.19-3.57l18.18-31.19Z'/%3E%3C/svg%3E")`

const maskStyle: React.CSSProperties = {
  WebkitMaskImage: SVG_MASK,
  WebkitMaskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskImage: SVG_MASK,
  maskSize: "contain",
  maskRepeat: "no-repeat",
  maskPosition: "center",
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS = [
  { value: 12,  suffix: "М т", decimals: 0, label: "Грузооборот порта Актау в год"          },
  { value: 14,  suffix: " ч",  decimals: 0, label: "Быстрейший рейс Актау → Туркменбаши"    },
  { value: 5,   suffix: "",    decimals: 0, label: "KZ · TM · AZ · IR · RU — весь Каспий"   },
  { value: 50,  suffix: "+",   decimals: 0, label: "Компаний-перевозчиков в системе"          },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function LpMap() {
  return (
    <section
      id="stats"
      className="bg-sidebar text-sidebar-foreground w-full border-t border-white/10 overflow-hidden py-8 md:py-24 px-6 md:px-12 lg:px-[120px]"
    >
      <div className="w-full max-w-[1440px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-[160px] items-stretch">

          {/* ── Left column ── */}
          <motion.div
            className="flex-1 flex flex-col justify-start"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
            }}
          >
            {/* Heading */}
            <h2 className="text-[clamp(1.5rem,4vw,3.5rem)] font-medium tracking-tight mb-6 leading-[1.1] w-[590px] max-w-full lp-display">
              <Typewriter text="Паромные маршруты" delay={0} speed={0.012} />
              <br />
              <Typewriter text="Каспийского " delay={0.25} speed={0.012} />
              <span className="font-dm-serif italic font-normal">
                <Typewriter text="моря" delay={0.35} speed={0.012} />
              </span>
            </h2>

            {/* Subtitle */}
            <p className="text-base md:text-lg text-sidebar-foreground/40 leading-relaxed font-light max-w-lg whitespace-normal mb-16">
              <Typewriter
                text="Пять государств, шесть портов, одна платформа. Cargora соединяет грузоотправителей и перевозчиков Каспийского региона с ИИ-подбором рейса и трекингом в реальном времени."
                delay={0.1}
                speed={0.008}
              />
            </p>

            {/* Stats grid */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-[max-content_max-content] gap-8 md:gap-x-16 lg:gap-x-24"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1, delayChildren: 0.05 },
                },
              }}
            >
              {STATS.map((s) => (
                <motion.div
                  key={s.label}
                  className="flex flex-col"
                  variants={{
                    hidden: { opacity: 0, y: 24 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.45, ease: "easeOut" },
                    },
                  }}
                >
                  <span className="text-4xl md:text-5xl lg:text-[56px] font-dm-serif tracking-tight mb-2 text-sidebar-foreground">
                    <AnimatedCounter
                      value={s.value}
                      suffix={s.suffix}
                      decimals={s.decimals}
                    />
                  </span>
                  <span className="text-[10px] md:text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                    {s.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>

          </motion.div>

          {/* ── Right column — triangle-masked video ── */}
          <div className="flex justify-center items-center shrink-0 lg:w-1/2 lg:pr-12 xl:pr-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1.15 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-full max-w-[460px] lg:max-w-none lg:w-[105%] aspect-square origin-center"
              style={maskStyle}
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              >
                <source src="/caspian-bg.mp4" type="video/mp4" />
              </video>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  )
}
