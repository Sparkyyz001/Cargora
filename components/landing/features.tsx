"use client"

import { motion } from "motion/react"
import {
  BarChart3,
  FileText,
  Users,
  Zap,
  ShieldCheck,
  TrendingUp,
} from "lucide-react"

const features = [
  {
    icon: BarChart3,
    title: "Аналитика в реальном времени",
    description:
      "Отслеживайте выручку, заказы и эффективность маршрутов в режиме реального времени с интерактивными графиками.",
  },
  {
    icon: FileText,
    title: "Управление заказами",
    description:
      "Создавайте, отслеживайте и обновляйте заказы в удобной таблице с фильтрацией, сортировкой и историей изменений.",
  },
  {
    icon: Users,
    title: "Клиентский портал",
    description:
      "Клиенты видят статус своих грузов в режиме реального времени — меньше звонков, выше удовлетворённость.",
  },
  {
    icon: Zap,
    title: "Молниеносная работа",
    description:
      "Платформа работает мгновенно даже при тысячах заказов. Никаких зависаний и долгих загрузок.",
  },
  {
    icon: ShieldCheck,
    title: "Безопасность данных",
    description:
      "Корпоративный уровень защиты: ролевые права доступа, журнал аудита и шифрование данных.",
  },
  {
    icon: TrendingUp,
    title: "Умная оптимизация",
    description:
      "Система выявляет неэффективные маршруты и предлагает оптимизацию, снижая затраты на топливо до 20%.",
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Всё необходимое для управления логистикой
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-pretty text-muted-foreground"
          >
            Единая платформа для диспетчеров, водителей и клиентов — заказы, маршруты и аналитика в одном месте.
          </motion.p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
              className="group rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-black/5"
            >
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-5 text-lg font-medium tracking-tight">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
