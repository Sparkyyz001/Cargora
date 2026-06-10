"use client"

import * as React from "react"
import { IconMapPin, IconRoute } from "@tabler/icons-react"

import type { Order } from "@/lib/actions/orders"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { OrderTrackingMap } from "@/components/order-tracking-map"

const STATUS_VARIANT: Record<Order["status"], "default" | "secondary" | "outline"> = {
  "В пути": "default",
  "Доставлен": "secondary",
  "Ожидает отправки": "outline",
}

const STATUS_HINT: Partial<Record<Order["status"], string>> = {
  "Ожидает отправки": "Маршрут построен — отслеживание начнётся, когда груз выедет",
  "В пути": "Груз в пути — позиция на карте обновляется в реальном времени",
  "Доставлен": "Груз доставлен получателю",
}

export function OrderTrackingDialog({ order }: { order: Order }) {
  const [open, setOpen] = React.useState(false)
  const canTrack = Boolean(order.sender_address && order.recipient_address)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={!canTrack}
          title={canTrack ? undefined : "Укажите адреса отправителя и получателя, чтобы построить маршрут"}
        >
          <IconMapPin className="size-4" />
          Отследить
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Заказ {order.order_number}
            <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
          </DialogTitle>
          <DialogDescription>
            {STATUS_HINT[order.status] ?? "Маршрут груза на карте 2ГИС"}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <OrderTrackingMap
            senderAddress={order.sender_address}
            recipientAddress={order.recipient_address}
            status={order.status}
            createdAt={order.created_at}
            deliveryDate={order.delivery_date}
          />
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <IconMapPin className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Отправитель</p>
              <p className="truncate text-sm font-medium">{order.sender_name ?? "—"}</p>
              <p className="truncate text-xs text-muted-foreground">{order.sender_address ?? "Адрес не указан"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
              <IconMapPin className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Получатель</p>
              <p className="truncate text-sm font-medium">{order.recipient_name ?? "—"}</p>
              <p className="truncate text-xs text-muted-foreground">{order.recipient_address ?? "Адрес не указан"}</p>
            </div>
          </div>
        </div>

        {order.driver && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconRoute className="size-4 shrink-0" />
            Перевозчик / рейс: <span className="font-medium text-foreground">{order.driver}</span>
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
