<div align="center">

# 🚢 Cargora

### Платформа грузовой логистики Каспийского региона

**ML-прогноз загрузки пунктов пропуска · ИИ-подбор рейсов · Реальный трекинг · 5 стран одним договором**

### 🌐 Живое демо: [cargora.vercel.app](https://cargora.vercel.app)

**SmartScape Hackathon 2026 · Трек 1: Smart Mobility & Infrastructure**

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## О проекте

**Cargora** — это SaaS-платформа для управления грузовой логистикой на Каспийском море.
Соединяет грузоотправителей, паромных перевозчиков и автоперевозчиков в единой экосистеме.

Проект разработан в рамках хакатона SmartScape 2026 (трек **Smart Mobility & Infrastructure**).

**Проблема.** Каспийский транзитный коридор (Средний коридор) перегружен: фуры стоят
на КПП «Болашак» сутками, штормы останавливают порт Актау, а перевозчики узнают об
очередях постфактум. Город и регион теряют пропускную способность, бизнес — деньги.

**Решение.** Cargora прогнозирует загруженность пунктов пропуска на 48 часов вперёд
**собственной ML-моделью** и подсказывает оптимальное окно прохождения — до того,
как груз встанет в очередь.

**Ключевая ценность:**
- **Собственная ML-модель** (scikit-learn, GradientBoosting) прогнозирует загрузку порта Актау, КПП «Болашак», «Тажен» и ж/д узла Бейнеу на 48 ч вперёд с учётом реального прогноза погоды — MAE 4.0%, на 41% точнее климатологического бейзлайна → [ml/README.md](ml/README.md)
- Грузоотправитель создаёт заявку → ИИ за секунды подбирает оптимальный рейс (паром или автодоставка) и рекомендует окно прибытия в порт по прогнозу модели
- Заявка прилетает диспетчеру в реальном времени (Supabase Realtime, звук + вибрация) — принятие в один клик
- Отправитель мгновенно получает уведомление о принятии, статус обновляется без перезагрузки
- Трекинг груза в реальном времени через 2GIS-карту
- Загруженность пунктов пропуска: порт Актау, КПП «Болашак», «Тажен», ж/д узел Бейнеу
- Региональная аналитика транзита для акимата: объёмы, динамика, структура грузов, топ направлений
- Подписочная модель: тарифы, оплата картой (Luhn-валидация), история платежей
- Охват: Казахстан · Туркменистан · Азербайджан · Иран · Россия

---

## Технологический стек

| Слой | Технология | Назначение |
|---|---|---|
| Фреймворк | **Next.js 16** (App Router, Turbopack, React 19) | SSR, API Routes, Server Actions |
| База данных | **Supabase** (PostgreSQL) | Хранение данных, RLS-политики |
| Аутентификация | **Supabase Auth** | Email + телефон, JWT-сессии |
| Стилизация | **Tailwind CSS v4** + shadcn/ui | UI-компоненты, тема |
| Анимации | **Motion** (преемник Framer Motion) | Scroll-анимации, typewriter, counters |
| ML | **scikit-learn** (GradientBoosting) → TS-инференс | Прогноз загрузки пунктов пропуска на 48 ч |
| Погода | **Open-Meteo API** | Реальный прогноз ветра/температуры — вход модели |
| ИИ | **Groq API** (`llama-3.3-70b-versatile`) | Генерация обоснования поверх нашей модели |
| Карты | **2GIS Maps API** | Реальный трекинг, маршрутизация |
| Язык | **TypeScript** | Полная типизация |
| Пакет-менеджер | **pnpm** | Управление зависимостями |

---

## Архитектура системы

```
Клиент (браузер)
    │
    ├── Лендинг (/)
    │       Анимации, видео-фон, ИИ-форма подбора рейса
    │
    ├── Авторизация (/login, /register)
    │       Supabase Auth → JWT → Cookie-сессия
    │
    └── Дашборд (/dashboard/*)
            │
            ├── Отправитель  → KPI + График + Заказы
            ├── Перевозчик   → Диспетчерская доска
            ├── Диспетчер   → Всё сразу
            └── Водитель     → Диспетчерская доска

API Routes (Server-side only)
    ├── /api/ai-route  →  ML-прогноз порта + Groq LLM + логика подбора рейса
    └── /api/forecast  →  прогноз загрузки 4 пунктов пропуска на 48 ч
                          (Open-Meteo → собственная GB-модель → лучшее окно)

ML-пайплайн (ml/)
    ├── generate_dataset.py  — симулятор транзитного потока (71 040 наблюдений)
    ├── train.py             — обучение GradientBoosting + метрики + экспорт
    └── lib/forecast-model.json + lib/forecast.ts — инференс прямо в Next.js

Supabase (PostgreSQL + RLS + Realtime)
    ├── profiles       — профили пользователей с ролями
    ├── orders         — заказы на перевозку (Realtime: заявки → диспетчеру)
    ├── customers      — клиентская база
    ├── vehicles       — парк транспорта
    ├── routes         — маршруты
    ├── subscriptions  — подписка пользователя (тариф, карта, период)
    └── payments       — история платежей
```

---

## Структура проекта

```
cargora/
│
├── 📁 app/                              # Next.js App Router
│   ├── page.tsx                         # Лендинг (главная)
│   ├── layout.tsx                       # Корневой layout (шрифты, тема, Toaster)
│   ├── globals.css                      # Tailwind v4 + кастомные CSS-переменные
│   │
│   ├── 📁 login/                        # Страница входа
│   ├── 📁 register/                     # Регистрация + выбор роли
│   ├── 📁 forgot-password/              # Сброс пароля
│   │
│   ├── 📁 dashboard/
│   │   ├── page.tsx                     # Ролевой роутинг (sender/carrier/dispatcher)
│   │   ├── layout.tsx                   # Sidebar-лэйаут дашборда
│   │   │
│   │   ├── 📁 orders/                   # Управление заказами
│   │   │   ├── page.tsx                 # Server component (данные из Supabase)
│   │   │   └── orders-client.tsx        # Client component (TanStack Table)
│   │   │
│   │   ├── 📁 fleet/                    # Управление автопарком
│   │   │   ├── page.tsx
│   │   │   └── fleet-client.tsx
│   │   │
│   │   ├── 📁 customers/                # CRM клиентов
│   │   ├── 📁 routes/                   # Управление маршрутами
│   │   ├── 📁 analytics/                # Аналитика и отчёты
│   │   ├── 📁 dispatch/                 # Диспетчерская доска
│   │   ├── 📁 map/                      # Карта в реальном времени
│   │   ├── 📁 settings/                 # Настройки профиля и тарифа
│   │   └── 📁 help/                     # Центр помощи
│   │
│   ├── 📁 api/
│   │   ├── 📁 ai-route/
│   │   │   └── route.ts                 # POST /api/ai-route — ИИ подбор рейса + прогноз порта
│   │   └── 📁 forecast/
│   │       └── route.ts                 # GET /api/forecast — ML-прогноз загрузки на 48 ч
│   │
│   ├── 📁 faq/                          # Публичная страница FAQ + форма
│   ├── 📁 privacy/                      # Политика конфиденциальности
│   └── 📁 terms/                        # Пользовательское соглашение
│
├── 📁 components/
│   │
│   ├── 📁 landing/                      # Секции лендинга
│   │   ├── hero.tsx                     # Hero с видео-фоном
│   │   ├── logo-cloud.tsx               # FlowingMenu — 5 стран Каспия
│   │   ├── lp-map.tsx                   # Статистика + видео в SVG-маске
│   │   ├── lp-services.tsx              # «Комплексная логистика» + фото
│   │   ├── lp-solutions.tsx             # Поиск маршрута + фотосетка
│   │   ├── lp-bento.tsx                 # Bento-сетка сервисов
│   │   ├── lp-process.tsx               # Таймлайн процесса
│   │   ├── testimonials.tsx             # Отзывы клиентов
│   │   ├── ready-cta.tsx                # CTA-секция с плиточными фото
│   │   ├── footer.tsx                   # Футер
│   │   └── landing-header.tsx           # Навигация лендинга
│   │
│   ├── data-table.tsx                   # Таблица заказов (TanStack Table v8)
│   ├── dispatch-view.tsx                # Kanban диспетчерской доски
│   ├── new-order-dialog.tsx             # Модал создания заявки + ИИ-подбор
│   ├── order-tracking-dialog.tsx        # Модал трекинга заказа
│   ├── order-tracking-map.tsx           # Компонент карты трекинга
│   ├── section-cards.tsx                # KPI-карточки (выручка, заказы, TЕУ)
│   ├── chart-area-interactive.tsx       # Интерактивный график выручки
│   ├── app-sidebar.tsx                  # Боковая панель дашборда
│   ├── nav-main.tsx                     # Основные пункты навигации
│   ├── nav-user.tsx                     # Меню пользователя (аватар + выход)
│   ├── site-header.tsx                  # Верхняя шапка дашборда
│   ├── live-map.tsx                     # Живая карта (2GIS)
│   ├── lang-toggle.tsx                  # Переключатель языка RU / KZ / EN
│   ├── theme-toggle.tsx                 # Тёмная/светлая тема
│   └── flowing-menu.tsx                 # Анимированное горизонтальное меню
│
├── 📁 lib/
│   ├── 📁 supabase/
│   │   ├── client.ts                    # Supabase клиент (браузер)
│   │   └── server.ts                    # Supabase клиент (SSR/Server Actions)
│   │
│   ├── 📁 actions/                      # Next.js Server Actions
│   │   ├── orders.ts                    # CRUD заказов
│   │   ├── customers.ts                 # CRUD клиентов
│   │   ├── vehicles.ts                  # CRUD автопарка
│   │   ├── routes.ts                    # CRUD маршрутов
│   │   ├── profile.ts                   # Обновление профиля пользователя
│   │   └── seed.ts                      # Утилита начального заполнения БД
│   │
│   ├── forecast.ts                      # Инференс ML-модели (проход по деревьям)
│   ├── forecast-model.json              # Экспорт обученной модели (220 деревьев)
│   ├── weather.ts                       # Open-Meteo: прогноз погоды для Актау
│   ├── geo.ts                           # Геодезические утилиты
│   ├── i18n.ts                          # Строки интернационализации
│   ├── use-lang.ts                      # Хук текущего языка
│   └── utils.ts                         # Общие утилиты (cn, formatDate и др.)
│
├── 📁 ml/                               # ML-пайплайн (Python, scikit-learn)
│   ├── generate_dataset.py              # Симулятор транзитного потока
│   ├── train.py                         # Обучение + метрики + экспорт модели
│   ├── parity_check.py / parity-check.ts# Сверка Python ↔ TypeScript инференса
│   ├── data/checkpoint_traffic.csv      # Датасет (71 040 наблюдений)
│   ├── figures/                         # Графики: прогноз vs факт, важность признаков
│   ├── metrics.json                     # Метрики качества на тесте
│   └── README.md                        # Методология данных и модели
│
├── 📁 public/
│   ├── cargora-logo.svg                 # Логотип бренда
│   ├── icon.svg                         # Favicon
│   ├── apple-icon.png                   # iOS иконка
│   ├── icon-dark-32x32.png              # Тёмная иконка 32px
│   ├── icon-light-32x32.png             # Светлая иконка 32px
│   ├── dashboard-preview.png            # OG-image / превью
│   ├── 📁 textures/                     # Текстуры глобуса
│   │   ├── earth-day.jpg
│   │   ├── earth-dark.jpg
│   │   └── earth-blue-marble.jpg
│   └── *.mp4                            # Видео (не в git — см. раздел ниже)
│
├── .env.example                         # Шаблон переменных окружения
├── .env.local                           # Секреты (НИКОГДА не коммитить)
├── .gitignore
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Быстрый старт

### 1. Клонировать и установить зависимости

```bash
git clone https://github.com/Sparkyyz001/Cargora.git
cd Cargora
pnpm install
```

### 2. Настроить переменные окружения

```bash
cp .env.example .env.local
```

Заполнить `.env.local`:

| Переменная | Где получить |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SITE_URL` | Домен продакшена или `http://localhost:3000` |
| `NEXT_PUBLIC_2GIS_API_KEY` | [dev.2gis.com](https://dev.2gis.com) → Dashboard |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys |

### 3. Настроить Supabase

В SQL Editor выполнить по порядку файлы из `supabase/`:

```
schema.sql                        — базовые таблицы (profiles, orders, vehicles, routes, customers) + RLS
migration_add_roles.sql           — роли пользователей при регистрации
migration_add_order_details.sql   — расширенные поля заказа
migration_billing.sql             — подписки и история платежей
migration_dispatcher_access.sql   — доступ диспетчера к входящим заявкам + Realtime
```

Затем:

```
Authentication → URL Configuration
  Site URL:       https://your-domain.com
  Redirect URLs:  https://your-domain.com/**
```

Включить Row Level Security на всех таблицах.

### 4. Видеоассеты

Видеофайлы исключены из git (крупные бинарники). Скачать и положить в `public/`:

| Файл | Используется в |
|---|---|
| `public/auth-bg.mp4` | Фон страниц входа / регистрации |
| `public/ferry-bg.mp4` | Фон Hero-секции лендинга |
| `public/caspian-bg.mp4` | SVG-треугольник в секции статистики |

> В продакшене рекомендуется хостить видео на Cloudinary / AWS S3 / Vercel Blob и заменить пути в `hero.tsx` и `lp-map.tsx`.

### 5. Запустить

```bash
pnpm dev
```

Открыть [http://localhost:3000](http://localhost:3000)

---

## Схема базы данных

```sql
-- Профили (расширяет auth.users)
profiles (
  id            uuid  PRIMARY KEY REFERENCES auth.users,
  full_name     text,
  company       text,
  phone         text,
  role          text   -- 'sender' | 'carrier' | 'dispatcher' | 'driver'
)

-- Заказы
orders (
  id              uuid  PRIMARY KEY,
  order_number    text,
  cargo_type      text,
  weight_kg       numeric,
  volume_m3       numeric,
  origin          text,
  destination     text,
  consignee       text,
  consignee_phone text,
  notes           text,
  status          text,  -- 'pending' | 'in_transit' | 'delivered' | 'cancelled'
  driver          text,  -- паром: "KF-2891 · Казахстан · 14:30"
                         -- авто:  "[LAND] TRK-2891 · КазТрансАвто · 08:00"
  user_id         uuid  REFERENCES auth.users,
  created_at      timestamptz
)

-- Автопарк
vehicles (
  id       uuid PRIMARY KEY,
  name     text,
  type     text,
  plate    text,
  driver   text,
  status   text,
  user_id  uuid REFERENCES auth.users
)

-- Клиенты и маршруты — стандартные CRM-поля
```

### Ролевая модель

| Роль | Дашборд | Что видит |
|---|---|---|
| `sender` | Отправитель | KPI-карточки + график выручки + таблица заказов |
| `carrier` | Перевозчик | Только диспетчерская доска |
| `dispatcher` | Диспетчер | Всё: доска + KPI + заказы |
| `driver` | Водитель | Только диспетчерская доска |

---

## Машинное обучение — прогноз загруженности пунктов пропуска

Ядро AI-части платформы — **собственная обученная модель** (не готовое API).
Полная методология: [ml/README.md](ml/README.md).

```
Open-Meteo (реальная погода: ветер, температура)
        ↓
GradientBoostingRegressor — обучен на 71 040 наблюдениях
(суточный/недельный/годовой профили, погода, праздники РК)
        ↓
GET /api/forecast — почасовой прогноз на 48 ч по 4 пунктам
+ рекомендация оптимального окна прохождения
```

| Метрика (тест март–июнь 2026) | Наша модель | Бейзлайн «час недели» |
|---|---|---|
| MAE | **4.04 %** | 6.85 % |
| R² | **0.896** | 0.797 |

Инференс выполняется на TypeScript внутри Next.js (деревья экспортированы в
`lib/forecast-model.json`) — отдельный Python-сервис в проде не нужен,
эквивалентность проверена сверкой `ml/parity_check.py` ↔ `ml/parity-check.ts`.

**Пример ответа `GET /api/forecast`:**

```json
{
  "ok": true,
  "horizon_hours": 48,
  "weather_source": "open-meteo",
  "model": { "metrics": { "mae": 4.04, "rmse": 5.81, "r2": 0.896 } },
  "points": [
    {
      "id": "aktau-port",
      "name": "Порт Актау",
      "current": { "loadPct": 66.8, "waitHours": 5.7, "queue": 5 },
      "bestWindow": { "start": "…", "end": "…", "avgLoad": 52.3 },
      "peak": { "ts": "…", "loadPct": 78.1 }
    }
  ]
}
```

---

## ИИ-маршрутизация

`POST /api/ai-route` — серверный обработчик, ключ Groq **не попадает на клиент**.

Для паромных заявок в контекст LLM подмешивается прогноз загрузки порта Актау от
нашей ML-модели, а в ответе появляется поле `portForecast` (текущая загрузка,
ожидание, оптимальное окно прибытия груза в порт) — LLM генерирует обоснование
**поверх** собственной модели, а не вместо неё.

**Запрос:**
```json
{
  "cargo_type": "Нефтепродукты",
  "weight": 25000,
  "recipient_address": "Туркменбаши, Туркменистан",
  "transport_type": "ferry"
}
```

**Ответ:**
```json
{
  "ok": true,
  "transport_type": "ferry",
  "ferry": {
    "id": "KF-2891",
    "vessel": "Казахстан",
    "route": "Актау → Туркменбаши",
    "departure": "14:30",
    "availTeu": 127,
    "pricePerTeu": 1100,
    "transitDays": 1
  },
  "teuNeeded": 2,
  "totalUsd": 2200,
  "commission": 44,
  "reasoning": "Рекомендую рейс KF-2891 — судно «Казахстан»..."
}
```

**Пул перевозчиков:**

| Тип | Маршруты |
|---|---|
| Паром (5 судов) | Актау → Туркменбаши, Баку (Алят), Амирабад |
| Автодоставка (6 перевозчиков) | Актау → Алматы, Астана, Шымкент, Атырау, Ташкент, Актобе |

**Кодировка транспорта в БД** (без миграций, обратно совместимо):
- Паром: значение поля `driver` = `KF-2891 · Казахстан · 14:30`
- Авто: `[LAND] TRK-2891 · КазТрансАвто · 08:00` (префикс `[LAND]`)

---

## Деплой

### Vercel

```bash
vercel --prod
```

Добавить все переменные из `.env.example` в Vercel → Settings → Environment Variables.

### После деплоя

1. Обновить `NEXT_PUBLIC_SITE_URL` на реальный домен
2. В Supabase → Auth → URL Configuration указать новый домен
3. Заменить пути видеофайлов на CDN-ссылки в `hero.tsx` и `lp-map.tsx`

---

## Безопасность

| Аспект | Статус |
|---|---|
| Секреты в коде | ✅ Нет — все ключи в `.env.local` |
| `.env.local` в git | ✅ Исключён через `.gitignore` |
| `GROQ_API_KEY` на клиенте | ✅ Только серверный Route Handler |
| Supabase Anon Key | ✅ Безопасен — защищён RLS-политиками |
| Row Level Security | ✅ Включён на всех таблицах |
| Валидация паролей | ✅ Минимум 6 символов |
| Доступ к заказам | ✅ Отправитель — только свои; диспетчер/перевозчик — входящие заявки (RLS-политики) |
| API `/api/ai-route` | ✅ Только для авторизованных пользователей |
| Видео в git | ✅ Исключены (87MB суммарно) |

---

## Лицензия

MIT — проект создан для хакатона.
