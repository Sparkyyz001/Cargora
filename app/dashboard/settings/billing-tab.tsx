"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check } from "lucide-react"

import {
  cancelSubscription,
  changePlan,
  subscribe,
  updateCard,
  type Payment,
  type Subscription,
} from "@/lib/actions/billing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const PLANS = [
  {
    id: "sender",
    name: "Грузоотправитель",
    price: 27000,
    description: "Нефтяные компании, трейдеры, экспортёры",
    features: ["Создание заявок на перевозку", "ИИ-подбор оптимального рейса", "Трекинг груза в реальном времени"],
  },
  {
    id: "carrier",
    name: "Перевозчик",
    price: 50000,
    description: "Судоходные компании и автоперевозчики",
    features: ["Все входящие заявки на груз", "Диспетчерская доска реального времени", "Аналитика по доходности рейсов"],
  },
] as const

const PLAN_NAMES: Record<string, string> = {
  sender: "Грузоотправитель",
  carrier: "Перевозчик",
}

function tenge(n: number) {
  return `${n.toLocaleString("ru-RU")} ₸`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU")
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

// ── Форма карты (общая для подключения и смены карты) ───────────────────────

function CardForm({
  submitLabel,
  pendingLabel,
  onSubmit,
}: {
  submitLabel: string
  pendingLabel: string
  onSubmit: (fd: FormData) => Promise<{ error?: string; success?: boolean }>
}) {
  const [number, setNumber] = React.useState("")
  const [expiry, setExpiry] = React.useState("")
  const [cvc, setCvc] = React.useState("")
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const fd = new FormData()
    fd.set("card_number", number)
    fd.set("expiry", expiry)
    fd.set("cvc", cvc)
    const result = await onSubmit(fd)
    setPending(false)
    if (result.error) toast.error(result.error)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="card-number">Номер карты</Label>
        <Input
          id="card-number"
          inputMode="numeric"
          placeholder="4400 4300 1234 5678"
          value={number}
          onChange={(e) => setNumber(formatCardNumber(e.target.value))}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="card-expiry">Срок действия</Label>
          <Input
            id="card-expiry"
            inputMode="numeric"
            placeholder="ММ/ГГ"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="card-cvc">CVC</Label>
          <Input
            id="card-cvc"
            inputMode="numeric"
            type="password"
            placeholder="•••"
            maxLength={3}
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 3))}
            required
          />
        </div>
      </div>
      <DialogFooter className="mt-2">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? pendingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ── Вкладка «Тариф и оплата» ─────────────────────────────────────────────────

export function BillingTab({
  subscription,
  payments,
  setupError,
}: {
  subscription: Subscription | null
  payments: Payment[]
  setupError: string | null
}) {
  const router = useRouter()
  const [checkoutPlan, setCheckoutPlan] = React.useState<(typeof PLANS)[number] | null>(null)
  const [cardDialogOpen, setCardDialogOpen] = React.useState(false)
  const [changeDialogOpen, setChangeDialogOpen] = React.useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const active = subscription?.status === "active" ? subscription : null

  async function handleSubscribe(fd: FormData) {
    if (!checkoutPlan) return { error: "Тариф не выбран" }
    fd.set("plan", checkoutPlan.id)
    const result = await subscribe(fd)
    if (result.success) {
      toast.success(`Тариф «${checkoutPlan.name}» подключён`)
      setCheckoutPlan(null)
      router.refresh()
    }
    return result
  }

  async function handleUpdateCard(fd: FormData) {
    const result = await updateCard(fd)
    if (result.success) {
      toast.success("Платёжная карта обновлена")
      setCardDialogOpen(false)
      router.refresh()
    }
    return result
  }

  async function handleChangePlan(planId: string) {
    setPending(true)
    const result = await changePlan(planId)
    setPending(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Тариф изменён на «${PLAN_NAMES[planId]}»`)
      setChangeDialogOpen(false)
      router.refresh()
    }
  }

  async function handleCancel() {
    setPending(true)
    const result = await cancelSubscription()
    setPending(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.info("Подписка отменена")
      setCancelDialogOpen(false)
      router.refresh()
    }
  }

  // ── Нет активной подписки: выбор тарифа ──
  if (!active) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Тариф и оплата</CardTitle>
          <CardDescription>
            {subscription?.status === "canceled"
              ? "Подписка отменена. Выберите тариф, чтобы продолжить работу."
              : "Тариф не подключён. Выберите подходящий план."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {setupError && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              {setupError}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PLANS.map((plan) => (
              <div key={plan.id} className="flex flex-col rounded-lg border p-4">
                <p className="font-medium">{plan.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{plan.description}</p>
                <p className="mt-3 text-2xl font-semibold tabular-nums">
                  {tenge(plan.price)}
                  <span className="text-sm font-normal text-muted-foreground"> / мес</span>
                </p>
                <ul className="mt-3 flex flex-1 flex-col gap-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="mt-4" onClick={() => setCheckoutPlan(plan)}>
                  Подключить
                </Button>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Нужен корпоративный план с интеграцией ERP/TMS?{" "}
            <a href="/faq" className="underline underline-offset-2 hover:text-foreground">
              Свяжитесь с нами
            </a>
          </p>
        </CardContent>

        <Dialog open={checkoutPlan !== null} onOpenChange={(open) => !open && setCheckoutPlan(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Подключение тарифа «{checkoutPlan?.name}»</DialogTitle>
              <DialogDescription>
                Спишется {checkoutPlan ? tenge(checkoutPlan.price) : ""}, далее ежемесячно. Отменить можно в любой момент.
              </DialogDescription>
            </DialogHeader>
            <CardForm
              submitLabel={checkoutPlan ? `Оплатить ${tenge(checkoutPlan.price)}` : "Оплатить"}
              pendingLabel="Обработка платежа..."
              onSubmit={handleSubscribe}
            />
          </DialogContent>
        </Dialog>
      </Card>
    )
  }

  // ── Активная подписка: данные пользователя ──
  return (
    <Card>
      <CardHeader>
        <CardTitle>Тариф и оплата</CardTitle>
        <CardDescription>Управление подпиской и платёжными данными</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="rounded-lg border p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">Текущий тариф</p>
            <p className="text-sm text-muted-foreground mt-1">
              {tenge(active.price)} / мес · действует до {formatDate(active.current_period_end)}
            </p>
          </div>
          <Badge className="text-sm px-3 py-1">{PLAN_NAMES[active.plan] ?? active.plan}</Badge>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Способ оплаты</Label>
          <div className="rounded-lg border p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded bg-muted px-2 py-1 text-xs font-bold">
                {active.card_brand ?? "CARD"}
              </div>
              <span className="text-sm">•••• •••• •••• {active.card_last4 ?? "????"}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCardDialogOpen(true)}>
              Изменить
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>История платежей</Label>
          {payments.length === 0 ? (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              Платежей пока нет
            </p>
          ) : (
            <div className="rounded-lg border divide-y">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{formatDate(p.paid_at)}</span>
                  <span className="font-medium tabular-nums">{tenge(p.amount)}</span>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    Оплачен
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" onClick={() => setChangeDialogOpen(true)}>
          Сменить тариф
        </Button>
        <Button variant="destructive" onClick={() => setCancelDialogOpen(true)}>
          Отменить подписку
        </Button>
      </CardFooter>

      {/* Смена карты */}
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новая платёжная карта</DialogTitle>
            <DialogDescription>
              Заменит карту {active.card_brand} •••• {active.card_last4}
            </DialogDescription>
          </DialogHeader>
          <CardForm
            submitLabel="Сохранить карту"
            pendingLabel="Проверка карты..."
            onSubmit={handleUpdateCard}
          />
        </DialogContent>
      </Dialog>

      {/* Смена тарифа */}
      <Dialog open={changeDialogOpen} onOpenChange={setChangeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Смена тарифа</DialogTitle>
            <DialogDescription>
              Новый тариф активируется сразу, спишется его месячная стоимость.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === active.plan
              return (
                <div
                  key={plan.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">{tenge(plan.price)} / мес</p>
                  </div>
                  {isCurrent ? (
                    <Badge variant="outline">Текущий</Badge>
                  ) : (
                    <Button size="sm" disabled={pending} onClick={() => handleChangePlan(plan.id)}>
                      {pending ? "Переключение..." : "Перейти"}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Отмена подписки */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Отменить подписку?</DialogTitle>
            <DialogDescription>
              Тариф «{PLAN_NAMES[active.plan]}» останется активным до{" "}
              {formatDate(active.current_period_end)}, после чего доступ к платным функциям будет ограничен.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Оставить подписку
            </Button>
            <Button variant="destructive" disabled={pending} onClick={handleCancel}>
              {pending ? "Отмена..." : "Да, отменить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
