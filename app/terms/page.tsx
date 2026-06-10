import Link from "next/link"
import { IconTruckDelivery } from "@tabler/icons-react"

export const metadata = {
  title: "Условия использования — Cargora",
  description: "Условия использования платформы Cargora",
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold mb-2">Условия использования</h1>
        <p className="text-sm text-muted-foreground mb-10">Последнее обновление: июнь 2026 г.</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold mb-3">1. Общие положения</h2>
            <p className="text-muted-foreground">
              Настоящие Условия использования регулируют доступ и использование платформы Cargora
              (далее — «Платформа»), предоставляемой для управления логистическими операциями.
              Используя Платформу, вы соглашаетесь с настоящими условиями в полном объёме.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Учётные записи</h2>
            <p className="text-muted-foreground">
              Вы несёте ответственность за сохранность данных вашей учётной записи, включая пароль.
              Незамедлительно уведомите нас о любом несанкционированном доступе к вашему аккаунту.
              Cargora не несёт ответственности за убытки, возникшие вследствие несоблюдения данного требования.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Допустимое использование</h2>
            <p className="text-muted-foreground">
              Вы обязуетесь использовать Платформу исключительно в законных целях. Запрещено
              использовать Платформу для распространения вредоносного программного обеспечения,
              несанкционированного доступа к данным других пользователей или любых иных действий,
              нарушающих законодательство Республики Казахстан.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Интеллектуальная собственность</h2>
            <p className="text-muted-foreground">
              Все права на программное обеспечение, дизайн и контент Платформы принадлежат Cargora.
              Вам предоставляется ограниченная, неисключительная лицензия на использование Платформы
              в рамках настоящих Условий.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Ограничение ответственности</h2>
            <p className="text-muted-foreground">
              Платформа предоставляется «как есть». Cargora не гарантирует бесперебойную работу
              сервиса и не несёт ответственности за косвенные убытки, возникшие в результате
              использования или невозможности использования Платформы.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Изменения условий</h2>
            <p className="text-muted-foreground">
              Мы оставляем за собой право изменять настоящие Условия в любое время. Продолжение
              использования Платформы после публикации изменений означает ваше согласие с новыми условиями.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Контакты</h2>
            <p className="text-muted-foreground">
              По вопросам, связанным с настоящими Условиями, обращайтесь по адресу:{" "}
              <a href="mailto:support@cargora.kz" className="text-primary hover:underline underline-offset-4">
                support@cargora.kz
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
