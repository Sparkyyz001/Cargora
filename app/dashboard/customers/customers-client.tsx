"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import type { Customer } from "@/lib/actions/customers"
import { seedDemoCustomers } from "@/lib/actions/customers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function EmptyState({ onSeed }: { onSeed: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <p className="text-muted-foreground text-sm">Клиентов пока нет.</p>
      <Button variant="outline" onClick={onSeed}>
        Загрузить демо-данные
      </Button>
    </div>
  )
}

export function CustomersClient({ customers: initialCustomers }: { customers: Customer[] }) {
  const router = useRouter()
  const [customers] = React.useState<Customer[]>(initialCustomers)

  async function handleSeed() {
    const result = await seedDemoCustomers()
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Демо-клиенты добавлены!")
      router.refresh()
    }
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <EmptyState onSeed={handleSeed} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Клиенты</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Клиент</TableHead>
                <TableHead>Город</TableHead>
                <TableHead className="text-right">Заказов</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Выручка</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.city ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.orders_count}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "Активный" ? "default" : "secondary"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.revenue ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
