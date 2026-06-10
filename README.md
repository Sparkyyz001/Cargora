<div align="center">

# 🚢 Cargora

### Платформа грузовой логистики Каспийского региона

**ИИ-подбор рейсов · Реальный трекинг · 5 стран одним договором**

[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## О проекте

**Cargora** — это SaaS-платформа для управления грузовой логистикой на Каспийском море.
Соединяет грузоотправителей, паромных перевозчиков и автоперевозчиков в единой экосистеме.

Проект разработан в рамках хакатона.

**Ключевая ценность:**
- Грузоотправитель создаёт заявку → ИИ за секунды подбирает оптимальный рейс (паром или автодоставка)
- Перевозчик видит заявку на диспетчерском дашборде и принимает в один клик
- Трекинг груза в реальном времени через 2GIS-карту
- Охват: Казахстан · Туркменистан · Азербайджан · Иран · Россия

---

## Технологический стек

| Слой | Технология | Назначение |
|---|---|---|
| Фреймворк | **Next.js 15** (App Router, React 19) | SSR, API Routes, Server Actions |
| База данных | **Supabase** (PostgreSQL) | Хранение данных, RLS-политики |
| Аутентификация | **Supabase Auth** | Email + телефон, JWT-сессии |
| Стилизация | **Tailwind CSS v4** + shadcn/ui | UI-компоненты, тема |
| Анимации | **Motion** (преемник Framer Motion) | Scroll-анимации, typewriter, counters |
| ИИ | **Groq API** (`llama-3.3-70b-versatile`) | Подбор маршрута, генерация обоснования |
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
    └── /api/ai-route  →  Groq LLM + логика подбора рейса

Supabase (PostgreSQL + RLS)
    ├── profiles    — профили пользователей с ролями
    ├── orders      — заказы на перевозку
    ├── customers   — клиентская база
    ├── vehicles    — парк транспорта
    └── routes      — маршруты
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
│   │   └── 📁 ai-route/
│   │       └── route.ts                 # POST /api/ai-route — ИИ подбор рейса
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
│   ├── geo.ts                           # Геодезические утилиты
│   ├── i18n.ts                          # Строки интернационализации
│   ├── use-lang.ts                      # Хук текущего языка
│   └── utils.ts                         # Общие утилиты (cn, formatDate и др.)
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
git clone https://github.com/your-username/cargora.git
cd cargora
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

В SQL Editor выполнить схему из `lib/actions/seed.ts`, затем:

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

## ИИ-маршрутизация

`POST /api/ai-route` — серверный обработчик, ключ Groq **не попадает на клиент**.

**Запрос:**
```json
{
  "destination": "Туркменбаши",
  "weight_kg": 25000,
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
| Паром (6 судов) | Актау → Туркменбаши, Баку, Амирабад, Энзели, Махачкала, Астрахань |
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
| Валидация паролей | ✅ Минимум 8 символов, буквы + цифры |
| Видео в git | ✅ Исключены (87MB суммарно) |

---

## Лицензия

MIT — проект создан для хакатона.
