"use client"

import * as React from "react"
import {
  IconCirclePlusFilled,
  IconCalendar,
  IconSparkles,
  IconShip,
  IconTruck,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { getLocalTimeZone, today, type DateValue } from "@internationalized/date"

import { createOrder } from "@/lib/actions/orders"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarRac } from "@/components/ui/calendar-rac"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { SidebarMenuButton } from "@/components/ui/sidebar"

type RouteRecommendation = {
  ok: boolean
  transport_type?: "ferry" | "land"
  ferry: {
    id: string
    vessel: string
    route: string
    departure: string
    availTeu: number
    pricePerTeu: number
    transitDays: number
  }
  teuNeeded: number
  totalUsd: number
  commission: number
  reasoning: string
}

type TransportType = "ferry" | "land"

function formatDeliveryDate(date: DateValue | null) {
  if (!date) return "Выбрать дату"
  return date.toDate(getLocalTimeZone()).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function NewOrderDialog({ label = "Новый заказ" }: { label?: string }) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [transportType, setTransportType] = React.useState<TransportType>("ferry")
  const [cargoType, setCargoType] = React.useState("")
  const [status, setStatus] = React.useState("Ожидает отправки")
  const [driver, setDriver] = React.useState("")
  const [deliveryDate, setDeliveryDate] = React.useState<DateValue | null>(null)
  const [showCalendar, setShowCalendar] = React.useState(false)
  const [recipientAddress, setRecipientAddress] = React.useState("")
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiResult, setAiResult] = React.useState<RouteRecommendation | null>(null)

  const weightRef = React.useRef<HTMLInputElement>(null)
  const volumeRef = React.useRef<HTMLInputElement>(null)

  const isFerry = transportType === "ferry"

  async function handleAIRoute() {
    setAiLoading(true)
    setAiResult(null)
    try {
      const res = await fetch("/api/ai-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cargo_type: cargoType,
          weight: weightRef.current?.value,
          volume: volumeRef.current?.value,
          recipient_address: recipientAddress,
          delivery_date: deliveryDate?.toString(),
          transport_type: transportType,
        }),
      })
      const data: RouteRecommendation = await res.json()
      setAiResult(data)
      const prefix = data.transport_type === "land" ? "[LAND] " : ""
      setDriver(`${prefix}${data.ferry.id} · ${data.ferry.route} · ${data.ferry.departure}`)
    } catch {
      toast.error("Ошибка ИИ-анализа — попробуйте ещё раз")
    } finally {
      setAiLoading(false)
    }
  }

  function handleTransportSwitch(type: TransportType) {
    setTransportType(type)
    setAiResult(null)
    setDriver("")
    setRecipientAddress("")
  }

  function resetForm() {
    setTransportType("ferry")
    setCargoType("")
    setStatus("Ожидает отправки")
    setDriver("")
    setDeliveryDate(null)
    setShowCalendar(false)
    setRecipientAddress("")
    setAiResult(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    if (cargoType) formData.set("cargo_type", cargoType)
    if (status) formData.set("status", status)
    if (driver) formData.set("driver", driver)
    if (deliveryDate) formData.set("delivery_date", deliveryDate.toString())

    const result = await createOrder(formData)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    const num = "order_number" in result ? `Заказ ${result.order_number}` : "Заказ"
    toast.success(isFerry ? `${num} создан — паромный перевозчик уведомлён` : `${num} создан — автоперевозчик уведомлён`)
    setOpen(false)
    resetForm()
  }

  const isLandResult = aiResult?.transport_type === "land"

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <SidebarMenuButton
          tooltip="Новый заказ"
          className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
        >
          <IconCirclePlusFilled />
          <span>{label}</span>
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Новый заказ</DialogTitle>
          <DialogDescription>
            Заполните данные о грузе, отправителе и получателе. ИИ подберёт оптимальный маршрут.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Transport type toggle */}
          <div className="flex overflow-hidden rounded-xl border border-border">
            <button
              type="button"
              onClick={() => handleTransportSwitch("ferry")}
              className={
                "flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors " +
                (isFerry
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50")
              }
            >
              <IconShip className="size-4" />
              Паромный
            </button>
            <button
              type="button"
              onClick={() => handleTransportSwitch("land")}
              className={
                "flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors " +
                (!isFerry
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50")
              }
            >
              <IconTruck className="size-4" />
              Сухопутный
            </button>
          </div>

          {/* Груз */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Тип груза</Label>
                <Select value={cargoType} onValueChange={setCargoType} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выбрать тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Нефтепродукты">Нефтепродукты</SelectItem>
                    <SelectItem value="Контейнер ТМТМ">Контейнер ТМТМ</SelectItem>
                    <SelectItem value="Металлопрокат">Металлопрокат</SelectItem>
                    <SelectItem value="Зерновые грузы">Зерновые грузы</SelectItem>
                    <SelectItem value="Строительные материалы">Строительные материалы</SelectItem>
                    <SelectItem value="Химические грузы">Химические грузы</SelectItem>
                    <SelectItem value="Автомобили">Автомобили</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Статус</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ожидает отправки">Ожидает отправки</SelectItem>
                    <SelectItem value="В пути">В пути</SelectItem>
                    <SelectItem value="Доставлен">Доставлен</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="weight">Вес (кг)</Label>
                <Input
                  id="weight"
                  name="weight"
                  type="number"
                  placeholder="18 000"
                  ref={weightRef}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="volume">Объём (м³)</Label>
                <Input id="volume" name="volume" type="number" placeholder="45" ref={volumeRef} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Дата отправки</Label>
              <button
                type="button"
                onClick={() => setShowCalendar((s) => !s)}
                className="flex h-9 w-full items-center gap-2 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none transition-colors hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:border-input dark:bg-input/30"
              >
                <IconCalendar className="size-4 text-muted-foreground" />
                <span className={deliveryDate ? "" : "text-muted-foreground"}>
                  {formatDeliveryDate(deliveryDate)}
                </span>
              </button>
              {showCalendar && (
                <div className="rounded-md border p-3 shadow-xs">
                  <CalendarRac
                    value={deliveryDate}
                    onChange={(date) => {
                      setDeliveryDate(date)
                      setShowCalendar(false)
                    }}
                    minValue={today(getLocalTimeZone())}
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Отправитель */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-medium text-muted-foreground">Отправитель</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sender_name">Компания / имя</Label>
                <Input
                  id="sender_name"
                  name="sender_name"
                  placeholder="ТОО КазМунайТранс"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sender_phone">Телефон</Label>
                <Input
                  id="sender_phone"
                  name="sender_phone"
                  type="tel"
                  placeholder="+7 729 200 00 00"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sender_address">
                {isFerry ? "Порт / адрес" : "Адрес загрузки"}
              </Label>
              <Input
                id="sender_address"
                name="sender_address"
                placeholder={isFerry ? "Актау, Морпорт, прич. 3" : "Актау, пр. Нурмагамбетова 24"}
                required
              />
            </div>
          </div>

          <Separator />

          {/* Получатель */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-medium text-muted-foreground">Получатель</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="recipient_name">Компания / имя</Label>
                <Input
                  id="recipient_name"
                  name="recipient_name"
                  placeholder={isFerry ? "Туркменбаши НПЗ" : "ТОО АлматыТрейд"}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="recipient_phone">Телефон</Label>
                <Input
                  id="recipient_phone"
                  name="recipient_phone"
                  type="tel"
                  placeholder={isFerry ? "+993 12 34 56 78" : "+7 727 200 00 00"}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="recipient_address">
                {isFerry ? "Порт назначения" : "Адрес доставки"}
              </Label>
              <Input
                id="recipient_address"
                name="recipient_address"
                placeholder={
                  isFerry
                    ? "Туркменбаши, Туркменистан"
                    : "Алматы, Астана, Шымкент, Атырау..."
                }
                required
                value={recipientAddress}
                onChange={(e) => {
                  setRecipientAddress(e.target.value)
                  setAiResult(null)
                }}
              />
            </div>
          </div>

          <Separator />

          {/* ИИ-маршрут */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {isFerry ? "Паромный рейс" : "Маршрут перевозки"}
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAIRoute}
                disabled={aiLoading || !recipientAddress.trim()}
                className="gap-1.5"
              >
                <IconSparkles className="size-4" />
                {aiLoading ? "Анализирую..." : "Подобрать ИИ"}
              </Button>
            </div>

            {aiResult && (
              <div
                className={
                  "flex flex-col gap-2 rounded-lg border p-4 " +
                  (isLandResult
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-sky-500/30 bg-sky-500/5")
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className={
                      "flex size-10 shrink-0 items-center justify-center rounded-full text-xl " +
                      (isLandResult ? "bg-amber-500/15" : "bg-sky-500/15")
                    }
                  >
                    {isLandResult ? "🚛" : "🚢"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        "text-sm font-semibold " +
                        (isLandResult
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-sky-600 dark:text-sky-400")
                      }
                    >
                      {aiResult.ferry.id} · {aiResult.ferry.vessel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {aiResult.ferry.route} · {isLandResult ? "Выезд" : "Отплытие"}{" "}
                      {aiResult.ferry.departure} · {aiResult.ferry.transitDays}{" "}
                      {aiResult.ferry.transitDays === 1 ? "день" : "дня"} в пути
                    </p>
                  </div>
                  <Badge
                    className={
                      "shrink-0 " +
                      (isLandResult
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        : "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30")
                    }
                  >
                    ИИ ✨
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {aiResult.reasoning}
                </p>
                <div className="flex flex-wrap gap-4 text-xs pt-1">
                  <span>
                    {isLandResult ? "Грузовиков" : "Мест"}:{" "}
                    <strong>
                      {aiResult.teuNeeded} / {aiResult.ferry.availTeu}{" "}
                      {isLandResult ? "шт" : "TEU"}
                    </strong>
                  </span>
                  <span>
                    Стоимость: <strong>${aiResult.totalUsd.toLocaleString()}</strong>
                  </span>
                  <span className="text-green-600 dark:text-green-400">
                    Комиссия: <strong>${aiResult.commission}</strong>
                  </span>
                </div>
              </div>
            )}

            {!aiResult && (
              <div className="flex items-center gap-2 rounded-md border border-dashed p-3">
                {isFerry ? (
                  <IconShip className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <IconTruck className="size-4 shrink-0 text-muted-foreground" />
                )}
                <p className="text-xs text-muted-foreground">
                  {recipientAddress.trim()
                    ? isFerry
                      ? "Нажмите «Подобрать ИИ» — система выберет оптимальный паром"
                      : "Нажмите «Подобрать ИИ» — система выберет перевозчика"
                    : isFerry
                      ? "Укажите порт назначения, чтобы ИИ подобрал рейс"
                      : "Укажите адрес доставки, чтобы ИИ подобрал маршрут"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !cargoType}>
              {loading ? "Создание..." : "Создать заказ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
