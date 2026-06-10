"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { IconTruckDelivery, IconRoute, IconChartBar, IconShieldCheck } from "@tabler/icons-react"
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

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

type AuthMode = "email" | "phone"
type PhoneStep = "input" | "otp"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [mode, setMode] = React.useState<AuthMode>("email")
  const [socialLoading, setSocialLoading] = React.useState<"google" | "linkedin" | null>(null)

  // Email mode
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [emailLoading, setEmailLoading] = React.useState(false)

  // Phone mode
  const [phone, setPhone] = React.useState("")
  const [otp, setOtp] = React.useState("")
  const [phoneStep, setPhoneStep] = React.useState<PhoneStep>("input")
  const [phoneLoading, setPhoneLoading] = React.useState(false)

  const rawRedirect = searchParams.get("from")
  const redirectTo =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard"

  // Show error from OAuth redirect
  React.useEffect(() => {
    if (searchParams.get("error") === "auth_failed") {
      toast.error("Ошибка входа. Попробуйте снова.")
    }
  }, [searchParams])

  function getCallbackUrl() {
    const origin = window.location.origin
    return `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
  }

  async function handleSocial(provider: "google" | "linkedin") {
    setSocialLoading(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider === "linkedin" ? "linkedin_oidc" : "google",
      options: { redirectTo: getCallbackUrl() },
    })
    if (error) {
      toast.error(`Ошибка входа через ${provider === "google" ? "Google" : "LinkedIn"}`)
      setSocialLoading(null)
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Заполните email и пароль")
      return
    }
    setEmailLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setEmailLoading(false)
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Неверный email или пароль")
      } else if (error.message.includes("Email not confirmed")) {
        toast.error("Подтвердите email — проверьте почту")
      } else {
        toast.error(error.message)
      }
      return
    }
    toast.success("Добро пожаловать в Cargora!")
    router.push(redirectTo)
    router.refresh()
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!phone) {
      toast.error("Введите номер телефона")
      return
    }
    // Ensure international format
    const formatted = phone.startsWith("+") ? phone : `+${phone}`
    setPhoneLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted })
    setPhoneLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setPhone(formatted)
    setPhoneStep("otp")
    toast.success("Код отправлен на ваш номер")
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) {
      toast.error("Код должен состоять из 6 цифр")
      return
    }
    setPhoneLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    })
    setPhoneLoading(false)
    if (error) {
      toast.error("Неверный или истёкший код")
      return
    }
    toast.success("Добро пожаловать в Cargora!")
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-10 text-white overflow-hidden bg-slate-950">
        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/auth-bg.mp4" type="video/mp4" />
        </video>

        {/* Dark overlay для читаемости текста */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/80" />

        {/* Content */}
        <Link href="/" className="relative flex items-center gap-2 z-10">
          <IconTruckDelivery className="size-7" />
          <span className="text-xl font-bold tracking-tight">Cargora</span>
        </Link>

        <div className="relative z-10 flex flex-col gap-8">
          <div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Логистика, которая <br />
              <span className="bg-gradient-to-r from-orange-300 via-rose-300 to-red-300 bg-clip-text text-transparent">
                работает на вас
              </span>
            </h2>
            <p className="mt-4 text-white/60 text-sm max-w-md leading-relaxed">
              Управляйте автопарком, маршрутами и заказами с единой платформы.
              Создано для перевозчиков Казахстана.
            </p>
          </div>

          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
                <IconRoute className="size-4" />
              </div>
              <div>
                <p className="font-medium">Оптимизация маршрутов</p>
                <p className="text-white/50 text-xs mt-0.5">Экономьте до 30% на топливе</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
                <IconChartBar className="size-4" />
              </div>
              <div>
                <p className="font-medium">Аналитика в реальном времени</p>
                <p className="text-white/50 text-xs mt-0.5">Принимайте решения на основе данных</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
                <IconShieldCheck className="size-4" />
              </div>
              <div>
                <p className="font-medium">Безопасное хранение данных</p>
                <p className="text-white/50 text-xs mt-0.5">Шифрование на уровне базы данных</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/40">
          <span>© 2026 Cargora</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
          <IconTruckDelivery className="size-6 text-primary" />
          <span className="text-lg font-bold">Cargora</span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Вход в систему</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Нет аккаунта?{" "}
              <Link href="/register" className="text-primary hover:underline underline-offset-4">
                Зарегистрироваться
              </Link>
            </p>
          </div>

          {/* Social buttons */}
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full gap-3 cursor-pointer"
              onClick={() => handleSocial("google")}
              disabled={!!socialLoading}
            >
              {socialLoading === "google" ? (
                <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <GoogleIcon />
              )}
              Войти через Google
            </Button>
            <Button
              variant="outline"
              className="w-full gap-3 cursor-pointer"
              onClick={() => handleSocial("linkedin")}
              disabled={!!socialLoading}
            >
              {socialLoading === "linkedin" ? (
                <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <LinkedInIcon />
              )}
              Войти через LinkedIn
            </Button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">или</span>
            <Separator className="flex-1" />
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 rounded-lg border p-1 mb-5">
            <button
              type="button"
              onClick={() => { setMode("email"); setPhoneStep("input") }}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                mode === "email"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => { setMode("phone"); setPhoneStep("input") }}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                mode === "phone"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Телефон
            </button>
          </div>

          {/* Email form */}
          {mode === "email" && (
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
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
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Пароль</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  >
                    Забыли пароль?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full mt-2 cursor-pointer" disabled={emailLoading}>
                {emailLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Вход...
                  </span>
                ) : "Войти"}
              </Button>
            </form>
          )}

          {/* Phone form — step 1: enter phone */}
          {mode === "phone" && phoneStep === "input" && (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Номер телефона</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 999 000-00-00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Введите в международном формате: +7, +375, +380…
                </p>
              </div>
              <Button type="submit" className="w-full cursor-pointer" disabled={phoneLoading}>
                {phoneLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Отправка...
                  </span>
                ) : "Получить код"}
              </Button>
            </form>
          )}

          {/* Phone form — step 2: enter OTP */}
          {mode === "phone" && phoneStep === "otp" && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="otp">Код из SMS</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  autoComplete="one-time-code"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Код отправлен на {phone}
                </p>
              </div>
              <Button type="submit" className="w-full cursor-pointer" disabled={phoneLoading}>
                {phoneLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Проверка...
                  </span>
                ) : "Войти"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full cursor-pointer"
                onClick={() => { setPhoneStep("input"); setOtp("") }}
              >
                ← Изменить номер
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Продолжая, вы соглашаетесь с{" "}
            <Link href="/terms" className="hover:underline underline-offset-4">условиями использования</Link>{" "}
            и{" "}
            <Link href="/privacy" className="hover:underline underline-offset-4">политикой конфиденциальности</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><span className="text-muted-foreground text-sm">Загрузка...</span></div>}>
      <LoginContent />
    </React.Suspense>
  )
}
