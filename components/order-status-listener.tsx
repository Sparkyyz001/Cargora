"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

// Следит за статусами заказов текущего пользователя: когда диспетчер
// принимает заявку, отправителю приходит уведомление, а серверные
// компоненты (таблица, карта, метрики) обновляются без перезагрузки.
// Realtime + резервный опрос — тот же паттерн, что в DispatchView.
export function OrderStatusListener() {
  const supabase = React.useMemo(() => createClient(), [])
  const router = useRouter()

  React.useEffect(() => {
    const known = new Map<number, string>()
    let first = true

    const notify = (num: string, status: string) => {
      if (status === "В пути") {
        toast.success(`Заявка ${num} принята — груз в пути`, {
          description: "Диспетчер подтвердил перевозку, следите за грузом на карте",
        })
      } else if (status === "Доставлен") {
        toast.success(`Заказ ${num} доставлен`)
      }
      router.refresh()
    }

    const apply = (id: number, num: string, status: string) => {
      const prev = known.get(id)
      known.set(id, status)
      if (!first && prev && prev !== status) notify(num, status)
    }

    const poll = async () => {
      try {
        const { data } = await supabase
          .from("orders")
          .select("id, order_number, status")
          .order("id", { ascending: false })
          .limit(100)
        if (!data) return
        for (const o of data) apply(o.id, o.order_number, o.status)
        first = false
      } catch {}
    }

    poll()
    const intervalId = setInterval(poll, 4000)

    const channel = supabase
      .channel("order-status-rt")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const o = payload.new as { id: number; order_number: string; status: string }
          apply(o.id, o.order_number, o.status)
        }
      )
      .subscribe()

    return () => {
      clearInterval(intervalId)
      channel.unsubscribe()
    }
  }, [supabase, router])

  return null
}
