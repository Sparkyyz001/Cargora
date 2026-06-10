"use client"

import * as React from "react"
import Link from "next/link"
import { IconTruckDelivery } from "@tabler/icons-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Step = "form" | "sent"

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [step, setStep] = React.useState<Step>("form")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings`,
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setStep("sent")
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-10">
          <IconTruckDelivery className="size-6 text-primary" />
          <span className="text-lg font-bold">Cargora</span>
        </Link>

        {step === "form" ? (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Забыли пароль?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Введите email — отправим ссылку для сброса
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@mail.ru"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Отправка...
                  </span>
                ) : "Отправить ссылку"}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center flex flex-col items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="size-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Письмо отправлено!</h2>
            <p className="text-sm text-muted-foreground">
              Проверьте почту <span className="font-medium text-foreground">{email}</span> — там ссылка для сброса пароля.
            </p>
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => { setStep("form"); setEmail("") }}
            >
              Отправить снова
            </Button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Вспомнили пароль?{" "}
          <Link href="/login" className="text-primary hover:underline underline-offset-4">
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}
