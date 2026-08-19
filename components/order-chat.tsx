"use client"

import * as React from "react"
import { IconSend } from "@tabler/icons-react"

import { createClient } from "@/lib/supabase/client"
import { findDriver, fullName, driverInitials } from "@/lib/drivers"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Переписка по заявке: отправитель, перевозчик и водитель в одной ветке.
//
// Нужна не для красоты: на практике половина звонков — «вы где» и «когда
// будете». Пока это идёт мимо платформы, диспетчер не видит договорённостей,
// а при споре не на что сослаться. Здесь всё привязано к номеру заявки.

export type ChatMessage = {
  id: number
  author: string
  role: "sender" | "carrier" | "driver" | "dispatcher"
  body: string
  created_at: string
  user_id: string | null
}

const ROLE_LABEL: Record<ChatMessage["role"], string> = {
  sender: "Отправитель",
  carrier: "Перевозчик",
  driver: "Водитель",
  dispatcher: "Диспетчер",
}

const ROLE_STYLE: Record<ChatMessage["role"], string> = {
  sender: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  carrier: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  driver: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  dispatcher: "bg-stone-500/15 text-stone-700 dark:text-stone-300",
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
}

/** «Сегодня», «Вчера» или дата — разделитель между днями переписки. */
function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const same = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()

  if (same(d, today)) return "Сегодня"
  if (same(d, yesterday)) return "Вчера"
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
}

/** Инициалы автора для аватара. */
function authorInitials(name: string): string {
  const clean = name.replace(/^(ТОО|АО|ИП|КХ)\s*/i, "").replace(/[«»"]/g, "").trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase()
}

export function OrderChat({
  orderId,
  driverKey,
  me,
}: {
  orderId: number
  /** Кто назначен на рейс — показываем в шапке. */
  driverKey?: string | null
  me: { id: string; name: string; role: ChatMessage["role"] }
}) {
  const supabase = React.useMemo(() => createClient(), [])
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [text, setText] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const endRef = React.useRef<HTMLDivElement>(null)

  const driver = findDriver(driverKey)

  // ── Загрузка и живая подписка ──
  React.useEffect(() => {
    let alive = true

    const load = async () => {
      const { data } = await supabase
        .from("order_messages")
        .select("id,author,role,body,created_at,user_id")
        .eq("order_id", orderId)
        .order("created_at")
      if (alive && data) setMessages(data as ChatMessage[])
    }

    load()

    const channel = supabase
      .channel(`order-chat-${orderId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_messages", filter: `order_id=eq.${orderId}` },
        (payload) => {
          const msg = payload.new as ChatMessage
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
        },
      )
      .subscribe()

    return () => {
      alive = false
      channel.unsubscribe()
    }
  }, [supabase, orderId])

  // Держим последнее сообщение в поле зрения
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [messages.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || sending) return

    setSending(true)
    // Оптимистично очищаем поле: ждать сервер, чтобы продолжить печатать,
    // в переписке невыносимо
    setText("")

    const { error } = await supabase.from("order_messages").insert({
      order_id: orderId,
      user_id: me.id,
      author: me.name,
      role: me.role,
      body,
    })

    if (error) setText(body)
    setSending(false)
  }

  return (
    <div className="flex flex-col rounded-lg border">
      {/* Шапка */}
      <div className="flex items-center gap-2.5 border-b px-3 py-2.5">
        {driver ? (
          <>
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              {driverInitials(driver)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{fullName(driver)}</p>
              <p className="text-xs text-muted-foreground">Водитель · {driver.phone}</p>
            </div>
            <a
              href={`tel:${driver.phone.replace(/\s/g, "")}`}
              className="shrink-0 text-xs text-primary hover:underline"
            >
              Позвонить
            </a>
          </>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Переписка по заявке</p>
            <p className="text-xs text-muted-foreground">Водитель ещё не назначен</p>
          </div>
        )}
      </div>

      {/* Лента */}
      <div className="flex max-h-72 min-h-36 flex-col gap-1 overflow-y-auto bg-muted/25 p-3">
        {messages.length === 0 ? (
          <p className="my-auto px-4 text-center text-xs text-muted-foreground">
            Сообщений пока нет. Спросите, где машина, или уточните время подачи —
            переписка сохраняется вместе с заявкой.
          </p>
        ) : (
          messages.map((m, i) => {
            const mine = m.user_id === me.id
            const prev = messages[i - 1]
            const next = messages[i + 1]

            // Разделитель дня, когда переписка переходит на новую дату
            const newDay =
              !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString()

            // Подряд идущие сообщения одного автора склеиваем в группу:
            // имя и аватар показываем только у первого, время — у последнего
            const groupStart = newDay || !prev || prev.user_id !== m.user_id
            const groupEnd = !next || next.user_id !== m.user_id ||
              new Date(next.created_at).toDateString() !== new Date(m.created_at).toDateString()

            return (
              <React.Fragment key={m.id}>
                {newDay && (
                  <div className="my-2 flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {dayLabel(m.created_at)}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}

                <div
                  className={cn(
                    "flex items-end gap-2",
                    mine ? "flex-row-reverse" : "flex-row",
                    groupEnd ? "mb-1.5" : "mb-0.5",
                  )}
                >
                  {/* Аватар только у собеседника и только в конце группы —
                      так лента не рябит повторами */}
                  {!mine ? (
                    groupEnd ? (
                      <div
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                          ROLE_STYLE[m.role],
                        )}
                      >
                        {authorInitials(m.author)}
                      </div>
                    ) : (
                      <div className="size-7 shrink-0" />
                    )
                  ) : null}

                  <div className={cn("flex max-w-[78%] flex-col", mine ? "items-end" : "items-start")}>
                    {groupStart && !mine && (
                      <div className="mb-1 flex items-center gap-1.5 px-1">
                        <span className="text-xs font-medium">{m.author}</span>
                        <span className={cn("rounded px-1 py-px text-[9px]", ROLE_STYLE[m.role])}>
                          {ROLE_LABEL[m.role]}
                        </span>
                      </div>
                    )}

                    <div
                      className={cn(
                        "px-3 py-1.5 text-sm shadow-xs",
                        mine
                          ? "bg-primary text-primary-foreground"
                          : "bg-background",
                        // Скругления как в мессенджерах: угол со стороны
                        // собеседника «прижат» только у последнего в группе
                        mine
                          ? cn("rounded-2xl rounded-br-md", !groupEnd && "rounded-br-2xl")
                          : cn("rounded-2xl rounded-bl-md", !groupEnd && "rounded-bl-2xl"),
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    </div>

                    {groupEnd && (
                      <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">
                        {timeOf(m.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Ввод */}
      <form onSubmit={send} className="flex gap-2 border-t p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написать водителю…"
          maxLength={2000}
          className="h-9 min-w-0 flex-1 rounded-md border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
        />
        <Button type="submit" size="icon" className="size-9 shrink-0" disabled={!text.trim() || sending}>
          <IconSend className="size-4" />
          <span className="sr-only">Отправить</span>
        </Button>
      </form>
    </div>
  )
}
