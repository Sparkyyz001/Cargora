"use client"

import * as React from "react"
import Link from "next/link"
import { IconMail, IconTruckDelivery, IconRoute, IconChartBar, IconShieldCheck, IconBuildingWarehouse, IconHeadset } from "@tabler/icons-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

// Требуем имя@домен.зона — отсекает "test@test", "asd@asd" и прочий мусор без рабочего домена
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Zа-яА-Я]{2,}$/

type Step = "role" | "form" | "sent"
type UserRole = "sender" | "carrier" | "dispatcher"

const ROLES: { id: UserRole; title: string; description: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  {
    id: "sender",
    title: "Отправитель груза",
    description: "Я отправляю грузы и ищу перевозчиков",
    Icon: IconBuildingWarehouse,
  },
  {
    id: "carrier",
    title: "Перевозчик",
    description: "У меня компания с автопарком",
    Icon: IconTruckDelivery,
  },
  {
    id: "dispatcher",
    title: "Диспетчер",
    description: "Я управляю заказами и маршрутами",
    Icon: IconHeadset,
  },
]

export default function RegisterPage() {
  const supabase = createClient()
  const [step, setStep] = React.useState<Step>("role")
  const [socialLoading, setSocialLoading] = React.useState<"google" | null>(null)
  const [loading, setLoading] = React.useState(false)

  const [role, setRole] = React.useState<UserRole | null>(null)
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")

  function getCallbackUrl() {
    return `${window.location.origin}/auth/callback?next=/dashboard`
  }

  async function handleSocial() {
    setSocialLoading("google")
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getCallbackUrl() },
    })
    if (error) {
      toast.error("Ошибка входа через Google")
      setSocialLoading(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) { toast.error("Выберите вашу роль"); setStep("role"); return }
    if (!firstName.trim()) { toast.error("Введите имя"); return }
    if (!lastName.trim()) { toast.error("Введите фамилию"); return }
    if (!EMAIL_REGEX.test(email.trim())) { toast.error("Введите рабочий email (например, name@mail.kz)"); return }
    if (password.length < 6) { toast.error("Пароль минимум 6 символов"); return }
    if (password !== confirm) { toast.error("Пароли не совпадают"); return }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: getCallbackUrl(),
      },
    })
    setLoading(false)

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Этот email уже зарегистрирован — попробуйте войти")
      } else {
        toast.error(error.message)
      }
      return
    }

    setStep("sent")
  }

  const Spinner = () => (
    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  )

  return (
    <div className="min-h-screen flex">
      {/* Левая панель */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-10 text-white overflow-hidden bg-slate-950">
        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/auth-bg.mp4" type="video/mp4" />
        </video>

        {/* Dark overlay для читаемости текста */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/80" />

        <Link href="/" className="relative flex items-center gap-2 z-10">
          <IconTruckDelivery className="size-7" />
          <span className="text-xl font-bold tracking-tight">Cargora</span>
        </Link>

        <div className="relative z-10 flex flex-col gap-8">
          <div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Присоединяйтесь к <br />
              <span className="bg-gradient-to-r from-orange-300 via-rose-300 to-red-300 bg-clip-text text-transparent">
                логистике будущего
              </span>
            </h2>
            <p className="mt-4 text-white/60 text-sm max-w-md leading-relaxed">
              Без карты. Без скрытых платежей. Полный доступ ко всем функциям платформы.
            </p>
          </div>

          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
                <IconRoute className="size-4" />
              </div>
              <div>
                <p className="font-medium">Интерактивная карта маршрутов</p>
                <p className="text-white/50 text-xs mt-0.5">Видите весь автопарк в реальном времени</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
                <IconChartBar className="size-4" />
              </div>
              <div>
                <p className="font-medium">Умная аналитика</p>
                <p className="text-white/50 text-xs mt-0.5">Отчёты по водителям, маршрутам и клиентам</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
                <IconShieldCheck className="size-4" />
              </div>
              <div>
                <p className="font-medium">Защита уровня банка</p>
                <p className="text-white/50 text-xs mt-0.5">Ваши данные изолированы и зашифрованы</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/40">
          <span>© 2026 Cargora</span>
        </div>
      </div>

      {/* Правая панель */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
          <IconTruckDelivery className="size-6 text-primary" />
          <span className="text-lg font-bold">Cargora</span>
        </Link>

        <div className="w-full max-w-md">
          {step === "role" && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Кто вы?</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Выберите роль — мы настроим интерфейс под ваши задачи
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {ROLES.map(({ id, title, description, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setRole(id); setStep("form") }}
                    className={`group flex items-center gap-4 rounded-xl border p-4 text-left transition-all hover:border-primary hover:bg-primary/5 cursor-pointer ${
                      role === id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                    <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all">→</span>
                  </button>
                ))}
              </div>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Уже есть аккаунт?{" "}
                <Link href="/login" className="text-primary hover:underline underline-offset-4 font-medium">
                  Войти
                </Link>
              </p>
            </>
          )}

          {step === "form" && (
            <>
              <button
                type="button"
                onClick={() => setStep("role")}
                className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                ← Изменить роль
              </button>

              <div className="mb-6">
                {role && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium mb-3">
                    {ROLES.find((r) => r.id === role)?.title}
                  </span>
                )}
                <h1 className="text-2xl font-semibold tracking-tight">Создать аккаунт</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Уже есть аккаунт?{" "}
                  <Link href="/login" className="text-primary hover:underline underline-offset-4">
                    Войти
                  </Link>
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full gap-3 cursor-pointer"
                onClick={handleSocial}
                disabled={!!socialLoading}
              >
                {socialLoading === "google" ? <Spinner /> : <GoogleIcon />}
                Зарегистрироваться через Google
              </Button>

              <div className="my-5 flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">или продолжите с email</span>
                <Separator className="flex-1" />
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="firstName">Имя</Label>
                    <Input
                      id="firstName"
                      placeholder="Айдар"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="lastName">Фамилия</Label>
                    <Input
                      id="lastName"
                      placeholder="Бекұлы"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="aidar@example.kz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Минимум 6 символов"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm">Повторите пароль</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full mt-1 cursor-pointer" disabled={loading}>
                  {loading
                    ? <span className="flex items-center gap-2"><Spinner />Создание...</span>
                    : "Создать аккаунт →"}
                </Button>
              </form>
            </>
          )}

          {step === "sent" && (
            <div className="flex flex-col items-center text-center gap-5">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                <IconMail className="size-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Подтвердите email</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Мы отправили письмо на{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                  Перейдите по ссылке в письме — и вы в системе.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setStep("form"); setEmail(""); setPassword(""); setConfirm("") }}
              >
                ← Изменить email
              </Button>
              <p className="text-xs text-muted-foreground">
                Не пришло? Проверьте папку «Спам».
              </p>
            </div>
          )}

          {step === "form" && (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Создавая аккаунт, вы соглашаетесь с{" "}
              <Link href="/terms" className="hover:underline underline-offset-4">условиями использования</Link>{" "}
              и{" "}
              <Link href="/privacy" className="hover:underline underline-offset-4">политикой конфиденциальности</Link>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
