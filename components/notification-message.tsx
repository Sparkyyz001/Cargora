"use client"

import * as React from "react"
import { IconMessageCircle } from "@tabler/icons-react"

import { OrderChat, type ChatMessage } from "@/components/order-chat"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Строка сообщения в ленте уведомлений, из которой можно сразу ответить.
//
// Без этого лента была тупиком: увидел вопрос — и иди ищи заявку
// на бирже, чтобы написать в ответ.

export function NotificationMessage({
  orderId,
  orderNumber,
  author,
  roleLabel,
  body,
  driverKey,
  ago,
  me,
}: {
  orderId: number
  orderNumber: string
  author: string
  roleLabel: string
  body: string
  driverKey: string | null
  ago: string
  me: { id: string; name: string; role: ChatMessage["role"] } | null
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-orange-600/15 text-orange-700 dark:text-orange-400">
            <IconMessageCircle className="size-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {author}: {body}
              </span>
              <Badge variant="outline" className="text-[10px]">
                Сообщение
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {orderNumber} · {roleLabel} · нажмите, чтобы ответить
            </p>
          </div>

          <span className="shrink-0 text-xs text-muted-foreground">{ago}</span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Переписка по заявке {orderNumber}</DialogTitle>
        </DialogHeader>

        {me ? (
          <OrderChat orderId={orderId} driverKey={driverKey} me={me} />
        ) : (
          <p className="text-sm text-muted-foreground">Войдите, чтобы отвечать.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
