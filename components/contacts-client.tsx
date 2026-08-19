"use client"

import * as React from "react"
import {
  IconArrowNarrowRight,
  IconBuildingStore,
  IconMapPin,
  IconPhone,
  IconTruck,
  IconUser,
} from "@tabler/icons-react"

import { fullName, driverInitials, type Driver } from "@/lib/drivers"
import { BODY_TYPE_LABELS, formatKzt, type BodyType } from "@/lib/economics"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// Справочник участников с раскрывающейся карточкой: слева список,
// справа полная информация по выбранному — контакты, статистика
// и история перевозок.

export type ContactOrder = {
  id: number
  number: string
  cargo: string
  status: string
  route: string
  tons: number
  createdAt: string
}

export type ContactCard = {
  id: string
  name: string
  kind: "sender" | "recipient" | "carrier" | "driver"
  phone: string | null
  city: string | null
  address: string | null
  orders: number
  tons: number
  revenueKzt: number
  history: ContactOrder[]
  /** Заполняется только для водителей. */
  driver?: Driver & { plate: string | null; vehicleStatus: string | null; bodyType: BodyType | null }
}

const KIND_LABEL: Record<ContactCard["kind"], string> = {
  sender: "Грузоотправитель",
  recipient: "Получатель",
  carrier: "Перевозчик",
  driver: "Водитель",
}

const KIND_STYLE: Record<ContactCard["kind"], string> = {
  sender: "border-blue-500/40 text-blue-600 dark:text-blue-400",
  recipient: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  carrier: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  driver: "border-amber-500/40 text-amber-600 dark:text-amber-400",
}

const AVATAR_STYLE: Record<ContactCard["kind"], string> = {
  sender: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  recipient: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  carrier: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  driver: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
}

function initials(c: ContactCard) {
  if (c.driver) return driverInitials(c.driver)
  const clean = c.name.replace(/^(ТОО|АО|ИП|КХ)\s*/i, "").replace(/[«»"]/g, "").trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase()
}

function statusStyle(status: string) {
  if (status === "В пути") return "border-blue-500/40 text-blue-600 dark:text-blue-400"
  if (status === "Доставлен") return "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
  return "border-amber-500/40 text-amber-600 dark:text-amber-400"
}

export function ContactsClient({ contacts }: { contacts: ContactCard[] }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(contacts[0]?.id ?? null)
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q),
    )
  }, [contacts, query])

  const selected = contacts.find((c) => c.id === selectedId) ?? null

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      {/* ── Список ── */}
      <Card className="overflow-hidden p-0">
        <div className="border-b p-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени или телефону"
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
          />
        </div>

        <div className="max-h-[calc(100svh-16rem)] divide-y overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                selectedId === c.id && "bg-muted",
              )}
            >
              <div className={cn("grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold", AVATAR_STYLE[c.kind])}>
                {initials(c)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {c.driver ? fullName(c.driver) : c.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {KIND_LABEL[c.kind]}
                  {c.city ? ` · ${c.city}` : ""}
                </p>
              </div>
              {c.orders > 0 && (
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                  {c.orders}
                </span>
              )}
            </button>
          ))}

          {filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">Никого не найдено.</p>
          )}
        </div>
      </Card>

      {/* ── Карточка ── */}
      {selected ? (
        <Card>
          <CardContent className="p-5">
            {/* Шапка */}
            <div className="flex items-start gap-4">
              <div className={cn("grid size-14 shrink-0 place-items-center rounded-full text-lg font-semibold", AVATAR_STYLE[selected.kind])}>
                {initials(selected)}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">
                  {selected.driver ? fullName(selected.driver) : selected.name}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px]", KIND_STYLE[selected.kind])}>
                    {KIND_LABEL[selected.kind]}
                  </Badge>
                  {selected.driver?.vehicleStatus && (
                    <Badge variant="secondary" className="text-[10px]">
                      {selected.driver.vehicleStatus}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Контакты */}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(selected.phone || selected.driver?.phone) && (
                <a
                  href={`tel:${(selected.driver?.phone ?? selected.phone ?? "").replace(/\s/g, "")}`}
                  className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5 transition-colors hover:bg-muted"
                >
                  <IconPhone className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Телефон</div>
                    <div className="truncate text-sm font-medium">
                      {selected.driver?.phone ?? selected.phone}
                    </div>
                  </div>
                </a>
              )}

              {selected.address && (
                <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                  <IconMapPin className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Адрес</div>
                    <div className="truncate text-sm font-medium">{selected.address}</div>
                  </div>
                </div>
              )}

              {selected.driver && (
                <>
                  <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                    <IconTruck className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Машина</div>
                      <div className="truncate text-sm font-medium">
                        {selected.driver.plate ?? "—"}
                        {selected.driver.bodyType ? ` · ${BODY_TYPE_LABELS[selected.driver.bodyType]}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                    <IconUser className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Опыт</div>
                      <div className="truncate text-sm font-medium">
                        стаж {selected.driver.experienceYears} лет · {selected.driver.license}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Separator className="my-4" />

            {/* Показатели */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Перевозок</div>
                <div className="mt-0.5 text-2xl font-bold tabular-nums">{selected.orders}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Тонн перевезено</div>
                <div className="mt-0.5 text-2xl font-bold tabular-nums">
                  {selected.tons.toFixed(1)}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Оборот</div>
                <div className="mt-0.5 text-2xl font-bold tabular-nums">
                  {formatKzt(selected.revenueKzt)}
                </div>
              </div>
            </div>

            {/* История */}
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                История перевозок
              </h3>

              {selected.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Перевозок пока не было.</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {selected.history.slice(0, 12).map((h) => (
                    <div key={h.id} className="flex items-center gap-3 px-3 py-2">
                      <IconBuildingStore className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{h.number}</span>
                          <span className="truncate text-sm">{h.cargo}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="truncate">{h.route}</span>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {h.tons.toFixed(1)} т
                      </span>
                      <Badge variant="outline" className={cn("shrink-0 text-[10px]", statusStyle(h.status))}>
                        {h.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="grid min-h-[240px] place-items-center p-6 text-center">
            <div>
              <IconArrowNarrowRight className="mx-auto size-6 rotate-180 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Выберите контакт слева, чтобы увидеть подробности
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
