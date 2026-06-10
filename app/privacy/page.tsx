import Link from "next/link"
import { IconTruckDelivery } from "@tabler/icons-react"

export const metadata = {
  title: "Политика конфиденциальности — Cargora",
  description: "Политика конфиденциальности платформы Cargora",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
            <IconTruckDelivery className="size-6 text-primary" />
            <span className="font-bold text-lg">Cargora</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Политика конфиденциальности</h1>
        <p className="text-sm text-muted-foreground mb-10">Последнее обновление: июнь 2026 г.</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold mb-3">1. Какие данные мы собираем</h2>
            <p className="text-muted-foreground">
              При регистрации мы собираем ваше имя и адрес электронной почты. В процессе
              использования Платформы собираются данные о заказах, маршрутах, транспортных
              средствах и клиентах, которые вы вносите самостоятельно.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Как мы используем данные</h2>
            <p className="text-muted-foreground">
              Данные используются исключительно для предоставления функциональности Платформы:
              авторизации, хранения и отображения ваших логистических данных. Мы не передаём
              ваши данные третьим лицам без вашего явного согласия.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Хранение данных</h2>
            <p className="text-muted-foreground">
              Ваши данные хранятся на защищённых серверах с использованием шифрования.
              Доступ к данным ограничен политиками безопасности на уровне базы данных (Row Level Security).
              Каждый пользователь имеет доступ только к своим данным.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Cookies</h2>
            <p className="text-muted-foreground">
              Мы используем cookies исключительно для поддержания сессии авторизованного пользователя.
              Сторонние маркетинговые cookies не применяются.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Ваши права</h2>
            <p className="text-muted-foreground">
              Вы вправе запросить экспорт, исправление или удаление ваших персональных данных
              в любое время. Для этого обратитесь к нам по электронной почте ниже.
              Удаление аккаунта влечёт безвозвратное удаление всех связанных данных.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Соответствие законодательству</h2>
            <p className="text-muted-foreground">
              Обработка персональных данных осуществляется в соответствии с Законом Республики
              Казахстан «О персональных данных и их защите» от 21 мая 2013 года № 94-V.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Контакты</h2>
            <p className="text-muted-foreground">
              По вопросам защиты персональных данных обращайтесь:{" "}
              <a href="mailto:privacy@cargora.kz" className="text-primary hover:underline underline-offset-4">
                privacy@cargora.kz
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t">
          <Link href="/register" className="text-sm text-primary hover:underline underline-offset-4">
            ← Вернуться к регистрации
          </Link>
        </div>
      </main>
    </div>
  )
}
