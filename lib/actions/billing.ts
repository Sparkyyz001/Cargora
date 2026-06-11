"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

const PLAN_PRICES: Record<string, { name: string; price: number }> = {
  sender: { name: "Грузоотправитель", price: 27000 },
  carrier: { name: "Перевозчик", price: 50000 },
}

export type Subscription = {
  plan: "sender" | "carrier"
  status: "active" | "canceled"
  price: number
  card_brand: string | null
  card_last4: string | null
  started_at: string
  current_period_end: string
}

export type Payment = {
  id: number
  plan: string
  amount: number
  status: string
  paid_at: string
}

export type BillingData = {
  subscription: Subscription | null
  payments: Payment[]
  setupError: string | null
}

function isMissingTable(message: string | undefined) {
  return !!message && message.includes("does not exist")
}

export async function getBilling(): Promise<BillingData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { subscription: null, payments: [], setupError: null }

  const [subRes, payRes] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("payments")
      .select("id, plan, amount, status, paid_at")
      .eq("user_id", user.id)
      .order("paid_at", { ascending: false })
      .limit(12),
  ])

  if (isMissingTable(subRes.error?.message) || isMissingTable(payRes.error?.message)) {
    return {
      subscription: null,
      payments: [],
      setupError: "Таблицы биллинга не созданы — запусти supabase/migration_billing.sql в Supabase SQL Editor",
    }
  }

  return {
    subscription: (subRes.data as Subscription | null) ?? null,
    payments: (payRes.data as Payment[] | null) ?? [],
    setupError: null,
  }
}

// ── Валидация карты ──────────────────────────────────────────────────────────

function luhnValid(digits: string) {
  let sum = 0
  let dbl = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (dbl) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    dbl = !dbl
  }
  return sum % 10 === 0
}

function cardBrand(digits: string) {
  if (digits.startsWith("4")) return "VISA"
  if (digits.startsWith("5")) return "Mastercard"
  if (digits.startsWith("2")) return "МИР"
  return "CARD"
}

function validateCard(formData: FormData): { error: string } | { brand: string; last4: string } {
  const digits = String(formData.get("card_number") ?? "").replace(/\D/g, "")
  const expiry = String(formData.get("expiry") ?? "").trim()
  const cvc = String(formData.get("cvc") ?? "").trim()

  if (digits.length !== 16) return { error: "Номер карты должен содержать 16 цифр" }
  if (!luhnValid(digits)) return { error: "Неверный номер карты — проверьте цифры" }

  const m = expiry.match(/^(\d{2})\s*\/\s*(\d{2})$/)
  if (!m) return { error: "Срок действия в формате ММ/ГГ" }
  const month = Number(m[1])
  const year = 2000 + Number(m[2])
  if (month < 1 || month > 12) return { error: "Месяц должен быть от 01 до 12" }
  const now = new Date()
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
    return { error: "Срок действия карты истёк" }
  }

  if (!/^\d{3}$/.test(cvc)) return { error: "CVC — 3 цифры с обратной стороны карты" }

  return { brand: cardBrand(digits), last4: digits.slice(-4) }
}

// ── Действия ─────────────────────────────────────────────────────────────────

export async function subscribe(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Не авторизован" }

  const plan = String(formData.get("plan") ?? "")
  const planInfo = PLAN_PRICES[plan]
  if (!planInfo) return { error: "Неизвестный тариф" }

  const card = validateCard(formData)
  if ("error" in card) return { error: card.error }

  const periodEnd = new Date()
  periodEnd.setDate(periodEnd.getDate() + 30)

  const { error } = await supabase.from("subscriptions").upsert({
    user_id: user.id,
    plan,
    status: "active",
    price: planInfo.price,
    card_brand: card.brand,
    card_last4: card.last4,
    started_at: new Date().toISOString(),
    current_period_end: periodEnd.toISOString(),
  })
  if (error) {
    if (isMissingTable(error.message)) {
      return { error: "Таблицы биллинга не созданы — запусти supabase/migration_billing.sql" }
    }
    return { error: error.message }
  }

  const { error: payError } = await supabase.from("payments").insert({
    user_id: user.id,
    plan,
    amount: planInfo.price,
  })
  if (payError) return { error: payError.message }

  revalidatePath("/dashboard/settings")
  return { success: true }
}

export async function updateCard(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Не авторизован" }

  const card = validateCard(formData)
  if ("error" in card) return { error: card.error }

  const { error } = await supabase
    .from("subscriptions")
    .update({ card_brand: card.brand, card_last4: card.last4 })
    .eq("user_id", user.id)
  if (error) return { error: error.message }

  revalidatePath("/dashboard/settings")
  return { success: true }
}

export async function changePlan(plan: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Не авторизован" }

  const planInfo = PLAN_PRICES[plan]
  if (!planInfo) return { error: "Неизвестный тариф" }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!sub || sub.status !== "active") return { error: "Нет активной подписки" }
  if (sub.plan === plan) return { error: "Этот тариф уже подключён" }

  const periodEnd = new Date()
  periodEnd.setDate(periodEnd.getDate() + 30)

  const { error } = await supabase
    .from("subscriptions")
    .update({ plan, price: planInfo.price, current_period_end: periodEnd.toISOString() })
    .eq("user_id", user.id)
  if (error) return { error: error.message }

  const { error: payError } = await supabase.from("payments").insert({
    user_id: user.id,
    plan,
    amount: planInfo.price,
  })
  if (payError) return { error: payError.message }

  revalidatePath("/dashboard/settings")
  return { success: true }
}

export async function cancelSubscription() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Не авторизован" }

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("user_id", user.id)
  if (error) return { error: error.message }

  revalidatePath("/dashboard/settings")
  return { success: true }
}
