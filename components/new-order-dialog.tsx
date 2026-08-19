"use client"

import * as React from "react"
import {
  IconCirclePlusFilled,
  IconCalendar,
  IconSparkles,
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
import { createClient } from "@/lib/supabase/client"
import { BODY_TYPE_LABELS, formatKzt, type BodyType } from "@/lib/economics"
import { SidebarMenuButton } from "@/components/ui/sidebar"

type RouteRecommendation = {
  ok: boolean
  distanceKm: number
  minutes: number
  carrier: {
    vehicleId: number
    carrierName: string
    plate: string
    bodyType: BodyType
    capacityKg: number
    deadheadToPickupKm: number
    suggestedPriceKzt: number
  } | null
  backhaul: {
    orderNumber: string
    cargoType: string
    fromName: string
    toName: string
    saving: { emptyKmWithout: number; emptyKmWith: number; kztSaved: number }
  } | null
  priceKzt: number
  commissionKzt: number
  fromName: string
  toName: string
  reasoning: string
  llm: boolean
}

type SettlementOption = { id: number; name: string }

/** Что реально возят внутри области. */
const CARGO_TYPES = [
  "Продукты питания",
  "Стройматериалы",
  "Питьевая вода",
  "Товары народного потребления",
  "Оборудование для промыслов",
  "Мебель и бытовая техника",
  "Комбикорм",
  "Инертные материалы",
]

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
  const [cargoType, setCargoType] = React.useState("")
  const [settlements, setSettlements] = React.useState<SettlementOption[]>([])
  const [fromId, setFromId] = React.useState("")
  const [toId, setToId] = React.useState("")
  const [bodyType, setBodyType] = React.useState<BodyType>("tent")
  const [driver, setDriver] = React.useState("")
  const [deliveryDate, setDeliveryDate] = React.useState<DateValue | null>(null)
  const [showCalendar, setShowCalendar] = React.useState(false)
  const [recipientAddress, setRecipientAddress] = React.useState("")
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiResult, setAiResult] = React.useState<RouteRecommendation | null>(null)

  const weightRef = React.useRef<HTMLInputElement>(null)
  const volumeRef = React.useRef<HTMLInputElement>(null)

  // Справочник НП тянем один раз при первом открытии диалога
  React.useEffect(() => {
    if (!open || settlements.length > 0) return
    const supabase = createClient()
    supabase
      .from("settlements")
      .select("id,name")
      .order("population", { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        if (data) setSettlements(data as SettlementOption[])
      })
  }, [open, settlements.length])

  const routeReady = Boolean(fromId && toId && fromId !== toId)

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
          fromSettlementId: Number(fromId),
          toSettlementId: Number(toId),
          bodyType,
          pickupFrom: deliveryDate?.toDate(getLocalTimeZone()).toISOString(),
        }),
      })
      const data: RouteRecommendation = await res.json()
      if (!data.ok) {
        toast.error("Подбор не удался — проверьте маршрут и вес")
        return
      }
      setAiResult(data)
      if (data.carrier) {
        setDriver(`${data.carrier.plate} · ${data.fromName} → ${data.toName} · ${data.carrier.carrierName}`)
      }
    } catch {
      toast.error("Ошибка ИИ-анализа — попробуйте ещё раз")
    } finally {
      setAiLoading(false)
    }
  }

  function resetForm() {
    setCargoType("")
    setFromId("")
    setToId("")
    setBodyType("tent")
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
    formData.set("status", "Ожидает отправки")
    if (driver) formData.set("driver", driver)
    if (deliveryDate) formData.set("delivery_date", deliveryDate.toString())

    // Поля перевозки по области — без них заявка не попадёт в матчинг
    formData.set("from_settlement_id", fromId)
    formData.set("to_settlement_id", toId)
    formData.set("body_type", bodyType)
    if (aiResult?.distanceKm) formData.set("distance_km", String(aiResult.distanceKm))
    if (deliveryDate) {
      const pickup = deliveryDate.toDate(getLocalTimeZone())
      pickup.setHours(8, 0, 0, 0)
      formData.set("pickup_from", pickup.toISOString())
      const until = new Date(pickup)
      until.setHours(18, 0, 0, 0)
      formData.set("pickup_to", until.toISOString())
    }

    const result = await createOrder(formData)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    const num = "order_number" in result ? `Заказ ${result.order_number}` : "Заказ"
    toast.success(`${num} создан — перевозчики области уже видят его на бирже`)
    setOpen(false)
    resetForm()
  }

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

          {/* Маршрут по области */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-medium text-muted-foreground">Маршрут</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Откуда</Label>
                <Select
                  value={fromId}
                  onValueChange={(v) => {
                    setFromId(v)
                    setAiResult(null)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Населённый пункт" />
                  </SelectTrigger>
                  <SelectContent>
                    {settlements.map((st) => (
                      <SelectItem key={st.id} value={String(st.id)}>
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Куда</Label>
                <Select
                  value={toId}
                  onValueChange={(v) => {
                    setToId(v)
                    setAiResult(null)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Населённый пункт" />
                  </SelectTrigger>
                  <SelectContent>
                    {settlements
                      .filter((st) => String(st.id) !== fromId)
                      .map((st) => (
                        <SelectItem key={st.id} value={String(st.id)}>
                          {st.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Тип кузова</Label>
              <Select
                value={bodyType}
                onValueChange={(v) => {
                  setBodyType(v as BodyType)
                  setAiResult(null)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(BODY_TYPE_LABELS) as BodyType[]).map((bt) => (
                    <SelectItem key={bt} value={bt}>
                      {BODY_TYPE_LABELS[bt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Груз */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Тип груза</Label>
              <Select value={cargoType} onValueChange={setCargoType} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выбрать тип" />
                </SelectTrigger>
                <SelectContent>
                  {CARGO_TYPES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="weight">Вес (кг)</Label>
                <Input
                  id="weight"
                  name="weight"
                  type="number"
                  placeholder="3 000"
                  ref={weightRef}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="volume">Объём (м³)</Label>
                <Input id="volume" name="volume" type="number" placeholder="15" ref={volumeRef} />
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
                  placeholder="ТОО «Каспий Фуд»"
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
              <Label htmlFor="sender_address">Адрес загрузки</Label>
              <Input
                id="sender_address"
                name="sender_address"
                placeholder="Актау, промзона, база №4"
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
                  placeholder="Магазин «Береке»"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="recipient_phone">Телефон</Label>
                <Input
                  id="recipient_phone"
                  name="recipient_phone"
                  type="tel"
                  placeholder="+7 729 350 11 22"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="recipient_address">Адрес доставки</Label>
              <Input
                id="recipient_address"
                name="recipient_address"
                placeholder="Жанаозен, мкр Шанырак, 12"
                required
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Подбор машины и обратной загрузки */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-muted-foreground">Подбор перевозчика</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAIRoute}
                disabled={aiLoading || !routeReady}
                className="gap-1.5"
              >
                <IconSparkles className="size-4" />
                {aiLoading ? "Анализирую..." : "Подобрать ИИ"}
              </Button>
            </div>

            {aiResult && (
              <div className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xl">
                    🚛
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {aiResult.carrier
                        ? `${aiResult.carrier.plate} · ${aiResult.carrier.carrierName}`
                        : "Свободной машины сейчас нет"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {aiResult.fromName} → {aiResult.toName} · {Math.round(aiResult.distanceKm)} км
                      {aiResult.carrier
                        ? ` · подача ${Math.round(aiResult.carrier.deadheadToPickupKm)} км`
                        : ""}
                    </p>
                  </div>
                  <Badge className="shrink-0 border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    {aiResult.llm ? "ИИ ✨" : "Расчёт"}
                  </Badge>
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">{aiResult.reasoning}</p>

                {aiResult.carrier && (
                  <div className="flex flex-wrap gap-4 pt-1 text-xs">
                    <span>
                      Кузов:{" "}
                      <strong>
                        {BODY_TYPE_LABELS[aiResult.carrier.bodyType]}{" "}
                        {(aiResult.carrier.capacityKg / 1000).toFixed(0)} т
                      </strong>
                    </span>
                    <span>
                      Стоимость: <strong>{formatKzt(aiResult.priceKzt)}</strong>
                    </span>
                    <span className="text-green-600 dark:text-green-400">
                      Комиссия: <strong>{formatKzt(aiResult.commissionKzt)}</strong>
                    </span>
                  </div>
                )}

                {aiResult.backhaul && (
                  <div className="mt-1 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Есть обратная загрузка: {aiResult.backhaul.cargoType},{" "}
                      {aiResult.backhaul.fromName} → {aiResult.backhaul.toName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Порожний пробег {Math.round(aiResult.backhaul.saving.emptyKmWithout)} км →{" "}
                      {Math.round(aiResult.backhaul.saving.emptyKmWith)} км · экономия{" "}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        {formatKzt(aiResult.backhaul.saving.kztSaved)}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            )}

            {!aiResult && (
              <div className="flex items-center gap-2 rounded-md border border-dashed p-3">
                <IconTruck className="size-4 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {routeReady
                    ? "Нажмите «Подобрать ИИ» — система найдёт машину и обратный груз"
                    : "Выберите откуда и куда, чтобы подобрать перевозчика"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !cargoType || !routeReady}>
              {loading ? "Создание..." : "Создать заявку"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
