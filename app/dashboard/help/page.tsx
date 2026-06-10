import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const faq = [
  {
    q: "Как создать новый заказ?",
    a: "Нажмите «Новый заказ» в боковом меню или на странице «Заказы». Заполните маршрут, габариты груза и получателя.",
  },
  {
    q: "Как назначить курьера на маршрут?",
    a: "Откройте «Маршруты», выберите запланированный рейс и назначьте свободную машину из автопарка.",
  },
  {
    q: "Где смотреть аналитику по доставкам?",
    a: "Раздел «Аналитика» показывает динамику заказов, долю доставок в срок и топ направлений.",
  },
  {
    q: "Как переключить тему оформления?",
    a: "Кнопка солнца/луны в правом верхнем углу, либо в «Настройки → Система».",
  },
]

export default function HelpPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <p className="text-muted-foreground">
        Частые вопросы по работе с платформой Cargora.
      </p>
      <div className="grid grid-cols-1 gap-4 @3xl/main:grid-cols-2">
        {faq.map((item) => (
          <Card key={item.q}>
            <CardHeader>
              <CardTitle className="text-base">{item.q}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{item.a}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
