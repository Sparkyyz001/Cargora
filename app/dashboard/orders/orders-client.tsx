"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import type { Order } from "@/lib/actions/orders"
import { deleteOrder, seedDemoOrders, updateOrderDriver, updateOrderStatus } from "@/lib/actions/orders"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { OrderTrackingDialog } from "@/components/order-tracking-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const CARRIERS = [
  "ТОО «КазМунайТранс»",
  "АО «Казмортрансфлот»",
  "ТОО «КаспийЛогистик»",
  "KTZE — KTZ Express",
  "ТОО «МангТрансОйл»",
  "АО «КазТрансОйл»",
]

function autoCarrier(orderId: number): string {
  return CARRIERS[orderId % CARRIERS.length]
}

function isValidCarrier(v: string | null | undefined): boolean {
  if (!v || v === "Не назначен") return false
  return (
    v.startsWith("ТОО") ||
    v.startsWith("АО") ||
    v.startsWith("KTZE") ||
    v.startsWith("ИП") ||
    v.includes("·")
  )
}

const STATUS_VARIANT: Record<Order["status"], "default" | "secondary" | "outline"> = {
  "В пути": "default",
  "Доставлен": "secondary",
  "Ожидает отправки": "outline",
}

function EmptyState({ onSeed }: { onSeed: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <p className="text-muted-foreground text-sm">Заказов пока нет.</p>
      <Button variant="outline" onClick={onSeed}>
        Загрузить демо-данные
      </Button>
    </div>
  )
}

export function OrdersClient({ orders: initialOrders }: { orders: Order[] }) {
  const router = useRouter()
  const [orders, setOrders] = React.useState<Order[]>(initialOrders)
  const [loading, setLoading] = React.useState<number | null>(null)

  React.useEffect(() => {
    setOrders(initialOrders)
  }, [initialOrders])

  async function handleSeed() {
    const result = await seedDemoOrders()
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Демо-заказы добавлены!")
      router.refresh()
    }
  }

  async function handleStatusChange(id: number, status: Order["status"]) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
    const result = await updateOrderStatus(id, status)
    if (result.error) toast.error(result.error)
  }

  async function handleDriverChange(id: number, driver: string) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, driver } : o)))
    const result = await updateOrderDriver(id, driver)
    if (result.error) toast.error(result.error)
  }

  async function handleDelete(id: number) {
    setLoading(id)
    setOrders((prev) => prev.filter((o) => o.id !== id))
    const result = await deleteOrder(id)
    if (result.error) {
      toast.error(result.error)
      router.refresh() // восстанавливаем состояние из сервера при ошибке
    } else {
      toast.success("Заказ удалён")
    }
    setLoading(null)
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-1 flex-col py-4 md:py-6 px-4 lg:px-6">
        <EmptyState onSeed={handleSeed} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col py-4 md:py-6">
      <div className="px-4 lg:px-6 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Номер заказа</TableHead>
              <TableHead>Тип груза</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Вес, кг</TableHead>
              <TableHead className="text-right">Объём, м³</TableHead>
              <TableHead>Перевозчик</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium tabular-nums">{order.order_number}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-muted-foreground">
                    {order.cargo_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={order.status}
                    onValueChange={(v) => handleStatusChange(order.id, v as Order["status"])}
                  >
                    <SelectTrigger className="h-8 w-44 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ожидает отправки">Ожидает отправки</SelectItem>
                      <SelectItem value="В пути">В пути</SelectItem>
                      <SelectItem value="Доставлен">Доставлен</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right tabular-nums">{order.weight ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{order.volume ?? "—"}</TableCell>
                <TableCell>
                  <span className="text-sm text-foreground">
                    {isValidCarrier(order.driver)
                      ? order.driver
                      : autoCarrier(order.id)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <OrderTrackingDialog order={order} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={loading === order.id}
                      onClick={() => handleDelete(order.id)}
                    >
                      {loading === order.id ? "..." : "Удалить"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
