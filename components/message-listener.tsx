"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"

// Следит за перепиской по всем заявкам, которые доступны пользователю.
// Без этого сообщение видно, только если открыта та самая карточка:
// диспетчер смотрит на карту и не узнаёт, что его о чём-то спросили.

const ROLE_LABEL: Record<string, string> = {
  sender: "отправитель",
  carrier: "перевозчик",
  driver: "водитель",
  dispatcher: "диспетчер",
}

export function MessageListener({ userId }: { userId: string | null }) {
  const supabase = React.useMemo(() => createClient(), [])
  const router = useRouter()

  React.useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel("messages-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_messages" },
        async (payload) => {
          const msg = payload.new as {
            id: number
            order_id: number
            user_id: string | null
            author: string
            role: string
            body: string
          }

          // Своё сообщение обратно не показываем
          if (msg.user_id === userId) return

          // Подтягиваем номер заявки: в уведомлении он важнее текста,
          // по нему понятно, о каком рейсе речь
          const { data: order } = await supabase
            .from("orders")
            .select("order_number")
            .eq("id", msg.order_id)
            .maybeSingle()

          // Если заявка не читается политиками — сообщение не наше
          if (!order) return

          toast.message(`${msg.author} · ${ROLE_LABEL[msg.role] ?? msg.role}`, {
            description: `${order.order_number}: ${msg.body}`,
            duration: 8000,
            action: {
              label: "Открыть",
              onClick: () => router.push("/dashboard/dispatch"),
            },
          })

          router.refresh()
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, userId, router])

  return null
}
