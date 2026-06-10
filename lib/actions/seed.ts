"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Реальные водители/операторы Мангистауского транспортного парка
const DRIVERS = ["Ахмет С.", "Батыр Ж.", "Нурлан Б.", "Арман Т.", "Серик К.", "Дауит М."]

// Генерация даты относительно сегодня (отрицательный offset = в прошлом)
function daysAgo(n: number): string {
  const d = new Date("2026-06-10")
  d.setDate(d.getDate() - n)
  return d.toISOString().split("T")[0]
}

export async function ensureUserData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Идемпотентность — если данные уже есть, не трогаем
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .like("order_number", "МАН-%")

  if ((count ?? 0) > 0) return

  // Чистим старое
  await Promise.all([
    supabase.from("orders").delete().eq("user_id", user.id),
    supabase.from("vehicles").delete().eq("user_id", user.id),
    supabase.from("routes").delete().eq("user_id", user.id),
    supabase.from("customers").delete().eq("user_id", user.id),
  ])

  // ─── 22 заказа ─────────────────────────────────────────────────────────────
  const orders = [
    // Доставленные — история
    {
      order_number: "МАН-00131", cargo_type: "Нефтепродукты",
      status: "Доставлен" as const, weight: 24000, volume: 29,
      driver: `KF-2891 · Казахстан · 14:30`,
      delivery_date: daysAgo(28),
      sender_name: "ТОО «МангистауМунай»", sender_phone: "+7 729 201 00 11",
      sender_address: "Актау, Нефтяной терминал",
      recipient_name: "LUKOIL Overseas", recipient_phone: "+7 872 200 00 55",
      recipient_address: "Махачкала, Россия",
    },
    {
      order_number: "МАН-00132", cargo_type: "Контейнер ТМТМ",
      status: "Доставлен" as const, weight: 22000, volume: 36,
      driver: `AZ-3301 · Дагестан · 20:15`,
      delivery_date: daysAgo(25),
      sender_name: "COSCO Shipping KZ", sender_phone: "+7 727 355 11 22",
      sender_address: "Актау, Морпорт, прич. 3",
      recipient_name: "DB Cargo Europe", recipient_phone: "+994 12 404 0000",
      recipient_address: "Баку, порт Алят, Азербайджан",
    },
    {
      order_number: "МАН-00133", cargo_type: "Металлопрокат",
      status: "Доставлен" as const, weight: 32000, volume: 28,
      driver: `IR-1201 · Хазар · 08:00`,
      delivery_date: daysAgo(22),
      sender_name: "АО «Қазцинк»", sender_phone: "+7 723 200 44 55",
      sender_address: "Актау, Терминал №2",
      recipient_name: "Arcelormittal Temirtau", recipient_phone: "+7 721 200 33 00",
      recipient_address: "Баку, порт Алят",
    },
    {
      order_number: "МАН-00134", cargo_type: "Зерновые грузы",
      status: "Доставлен" as const, weight: 30000, volume: 42,
      driver: DRIVERS[3],
      delivery_date: daysAgo(20),
      sender_name: "ТОО «КазАгроЭкс»", sender_phone: "+7 729 211 55 66",
      sender_address: "Бейнеу, зерновой склад",
      recipient_name: "Tehran Grain Trading", recipient_phone: "+98 21 8800 0000",
      recipient_address: "Амирабад, Иран",
    },
    {
      order_number: "МАН-00135", cargo_type: "Химические грузы",
      status: "Доставлен" as const, weight: 9800, volume: 14,
      driver: `KF-2891 · Казахстан · 14:30`,
      delivery_date: daysAgo(18),
      sender_name: "АО «Каустик»", sender_phone: "+7 729 233 10 00",
      sender_address: "Актау, Химпром",
      recipient_name: "Туркменхимия", recipient_phone: "+993 12 39 00 00",
      recipient_address: "Туркменбаши, хим. порт",
    },
    {
      order_number: "МАН-00136", cargo_type: "Нефтепродукты",
      status: "Доставлен" as const, weight: 21000, volume: 26,
      driver: `AZ-3301 · Дагестан · 20:15`,
      delivery_date: daysAgo(15),
      sender_name: "АО «КазТрансОйл»", sender_phone: "+7 727 244 88 00",
      sender_address: "Актау, Нефтяной терминал",
      recipient_name: "SOCAR Petroleum", recipient_phone: "+994 12 555 00 00",
      recipient_address: "Баку, Нефтчала",
    },
    {
      order_number: "МАН-00137", cargo_type: "Автомобили",
      status: "Доставлен" as const, weight: 16000, volume: 45,
      driver: `[LAND] TRK-2891 · КазТрансАвто · КамАЗ 20т · 08:00`,
      delivery_date: daysAgo(13),
      sender_name: "ТОО «АвтоИмпорт KZ»", sender_phone: "+7 727 300 50 60",
      sender_address: "Актау, СЭАЗ",
      recipient_name: "Дилерский центр Тойота", recipient_phone: "+7 727 356 00 00",
      recipient_address: "Алматы, мкр Алтай",
    },
    {
      order_number: "МАН-00138", cargo_type: "Металлопрокат",
      status: "Доставлен" as const, weight: 28000, volume: 30,
      driver: `RU-0901 · Астрахань · 06:45`,
      delivery_date: daysAgo(11),
      sender_name: "ТОО «МетЛогистик»", sender_phone: "+7 729 200 70 80",
      sender_address: "Бейнеу, ж/д терминал",
      recipient_name: "Kardemir Steel", recipient_phone: "+993 12 45 00 00",
      recipient_address: "Туркменбаши, порт",
    },
    {
      order_number: "МАН-00139", cargo_type: "Зерновые грузы",
      status: "Доставлен" as const, weight: 25000, volume: 40,
      driver: `IR-1201 · Хазар · 08:00`,
      delivery_date: daysAgo(9),
      sender_name: "ТОО «АгроЭкспорт KZ»", sender_phone: "+7 729 220 33 44",
      sender_address: "Актау, Зерновой терминал",
      recipient_name: "Иранский экспорт", recipient_phone: "+98 21 7700 0000",
      recipient_address: "Амирабад, Иран",
    },
    {
      order_number: "МАН-00140", cargo_type: "Строительные материалы",
      status: "Доставлен" as const, weight: 11500, volume: 16,
      driver: `[LAND] TRK-3401 · МанТранс · МАЗ 20т · 06:00`,
      delivery_date: daysAgo(7),
      sender_name: "ТОО «ЖезқазғанЦемент»", sender_phone: "+7 710 234 55 66",
      sender_address: "Актау, склад №7",
      recipient_name: "ГП «ТуркменЗнак»", recipient_phone: "+993 12 55 00 00",
      recipient_address: "Туркменабад, Туркменистан",
    },
    // В пути — активные
    {
      order_number: "МАН-00141", cargo_type: "Нефтепродукты",
      status: "В пути" as const, weight: 18500, volume: 22,
      driver: `KF-2891 · Казахстан · 14:30`,
      delivery_date: daysAgo(-1),
      sender_name: "ТОО «КазМунайТранс»", sender_phone: "+7 729 201 00 00",
      sender_address: "Актау, Промзона, уч. 14",
      recipient_name: "Туркменбаши НПЗ", recipient_phone: "+993 12 33 00 00",
      recipient_address: "Туркменбаши, Туркменистан",
    },
    {
      order_number: "МАН-00142", cargo_type: "Контейнер ТМТМ",
      status: "В пути" as const, weight: 20500, volume: 34,
      driver: `AZ-3301 · Дагестан · 20:15`,
      delivery_date: daysAgo(-2),
      sender_name: "KTZE (KTZ Express)", sender_phone: "+7 727 355 00 00",
      sender_address: "Актау, Морпорт, прич. 5",
      recipient_name: "ADY Container", recipient_phone: "+994 12 490 0000",
      recipient_address: "Баку, порт Алят",
    },
    {
      order_number: "МАН-00143", cargo_type: "Химические грузы",
      status: "В пути" as const, weight: 7200, volume: 10,
      driver: `KF-2891 · Казахстан · 14:30`,
      delivery_date: daysAgo(-2),
      sender_name: "ТОО «НефтеХим»", sender_phone: "+7 729 244 33 11",
      sender_address: "Жанаозен, завод",
      recipient_name: "Азот-Туркменистан", recipient_phone: "+993 12 40 00 00",
      recipient_address: "Туркменбаши, хим. порт",
    },
    {
      order_number: "МАН-00144", cargo_type: "Металлопрокат",
      status: "В пути" as const, weight: 19000, volume: 24,
      driver: `[LAND] TRK-1204 · КазЛогистик · Volvo FH · 10:00`,
      delivery_date: daysAgo(-3),
      sender_name: "АО «Қазцинк»", sender_phone: "+7 723 200 44 55",
      sender_address: "Актау, Терминал №2",
      recipient_name: "ТОО «ПромМеталл»", recipient_phone: "+7 727 388 22 11",
      recipient_address: "Алматы, индустриальная зона",
    },
    {
      order_number: "МАН-00145", cargo_type: "Нефтепродукты",
      status: "В пути" as const, weight: 23500, volume: 28,
      driver: `RU-0901 · Астрахань · 06:45`,
      delivery_date: daysAgo(-1),
      sender_name: "АО «КазТрансОйл»", sender_phone: "+7 727 244 88 00",
      sender_address: "Актау, Нефтяной терминал",
      recipient_name: "ЛУКойл-Нижневолжскнефть", recipient_phone: "+7 851 200 00 00",
      recipient_address: "Астрахань, Россия",
    },
    // Ожидают — очередь
    {
      order_number: "МАН-00146", cargo_type: "Строительные материалы",
      status: "Ожидает отправки" as const, weight: 14000, volume: 18,
      driver: DRIVERS[4],
      delivery_date: daysAgo(-4),
      sender_name: "ТОО «Актауқұрылыс»", sender_phone: "+7 729 255 00 11",
      sender_address: "Актау, мкр 31",
      recipient_name: "ТОО «МангКурылыс»", recipient_phone: "+7 729 244 22 33",
      recipient_address: "Жанаозен, Мангистауская обл.",
    },
    {
      order_number: "МАН-00147", cargo_type: "Контейнер ТМТМ",
      status: "Ожидает отправки" as const, weight: 19500, volume: 32,
      driver: DRIVERS[2],
      delivery_date: daysAgo(-5),
      sender_name: "China Merchants KZ", sender_phone: "+7 727 300 11 22",
      sender_address: "Актау, Морпорт, прич. 1",
      recipient_name: "Hapag-Lloyd Азербайджан", recipient_phone: "+994 12 404 1111",
      recipient_address: "Баку, порт Алят",
    },
    {
      order_number: "МАН-00148", cargo_type: "Зерновые грузы",
      status: "Ожидает отправки" as const, weight: 26000, volume: 38,
      driver: DRIVERS[1],
      delivery_date: daysAgo(-5),
      sender_name: "ТОО «АгроЭкспорт KZ»", sender_phone: "+7 729 220 33 44",
      sender_address: "Актау, Зерновой терминал",
      recipient_name: "Energo Grain Iran", recipient_phone: "+98 21 6600 0000",
      recipient_address: "Энзели, Иран",
    },
    {
      order_number: "МАН-00149", cargo_type: "Нефтепродукты",
      status: "Ожидает отправки" as const, weight: 17000, volume: 21,
      driver: DRIVERS[0],
      delivery_date: daysAgo(-6),
      sender_name: "ТОО «МангистауМунай»", sender_phone: "+7 729 201 00 11",
      sender_address: "Актау, Нефтяной терминал",
      recipient_name: "Нафт Иран Интерн.", recipient_phone: "+98 21 9900 0000",
      recipient_address: "Амирабад, Иран",
    },
    {
      order_number: "МАН-00150", cargo_type: "Автомобили",
      status: "Ожидает отправки" as const, weight: 12000, volume: 30,
      driver: DRIVERS[5],
      delivery_date: daysAgo(-7),
      sender_name: "ТОО «АвтоИмпорт KZ»", sender_phone: "+7 727 300 50 60",
      sender_address: "Актау, СЭАЗ",
      recipient_name: "Diler Group Баку", recipient_phone: "+994 12 567 0000",
      recipient_address: "Баку, Азербайджан",
    },
    {
      order_number: "МАН-00151", cargo_type: "Химические грузы",
      status: "Ожидает отправки" as const, weight: 8400, volume: 12,
      driver: DRIVERS[3],
      delivery_date: daysAgo(-8),
      sender_name: "АО «Каустик»", sender_phone: "+7 729 233 10 00",
      sender_address: "Актау, Химпром",
      recipient_name: "Petkim Petrochemical", recipient_phone: "+994 12 400 0000",
      recipient_address: "Баку, Азербайджан",
    },
    {
      order_number: "МАН-00152", cargo_type: "Металлопрокат",
      status: "Ожидает отправки" as const, weight: 31000, volume: 35,
      driver: DRIVERS[2],
      delivery_date: daysAgo(-9),
      sender_name: "ТОО «КазМеталлЭкс»", sender_phone: "+7 729 266 44 55",
      sender_address: "Актау, Терминал №3",
      recipient_name: "TMT Steel Туркменистан", recipient_phone: "+993 12 50 00 00",
      recipient_address: "Туркменбаши, порт",
    },
  ]

  // ─── 6 единиц автопарка ────────────────────────────────────────────────────
  const vehicles = [
    { vehicle_code: "АКТ-01", plate: "А 123 ВС 16", driver: DRIVERS[0], status: "В рейсе" as const,  load_percent: 92, route: "Актау → Туркменбаши" },
    { vehicle_code: "АКТ-02", plate: "В 456 КМ 16", driver: DRIVERS[1], status: "В рейсе" as const,  load_percent: 78, route: "Актау → Баку (Алят)" },
    { vehicle_code: "АКТ-03", plate: "С 789 РН 16", driver: DRIVERS[2], status: "Свободна" as const, load_percent: 0,  route: "—" },
    { vehicle_code: "АКТ-04", plate: "Н 321 ЕК 16", driver: DRIVERS[3], status: "На ТО" as const,    load_percent: 0,  route: "Сервис, Актау" },
    { vehicle_code: "БЕЙ-05", plate: "М 654 ОР 16", driver: DRIVERS[4], status: "В рейсе" as const,  load_percent: 95, route: "Бейнеу → Болашак КПП" },
    { vehicle_code: "БЕЙ-06", plate: "К 987 АХ 16", driver: DRIVERS[5], status: "Свободна" as const, load_percent: 0,  route: "—" },
  ]

  // ─── 6 маршрутов ──────────────────────────────────────────────────────────
  const routes = [
    { route_code: "ТМТМ-1042", from_city: "Порт Актау",  to_city: "Туркменбаши",  driver: DRIVERS[0], eta: "8ч 30м",  progress: 68, status: "В пути" as const },
    { route_code: "ТМТМ-1043", from_city: "Порт Актау",  to_city: "Баку (Алят)",  driver: DRIVERS[1], eta: "11ч 20м", progress: 41, status: "В пути" as const },
    { route_code: "МАН-1044",  from_city: "Бейнеу",       to_city: "Болашак КПП", driver: DRIVERS[4], eta: "1ч 45м",  progress: 88, status: "Завершается" as const },
    { route_code: "МАН-1045",  from_city: "Жанаозен",     to_city: "Порт Актау",  driver: "—",        eta: "—",       progress: 0,  status: "Запланирован" as const },
    { route_code: "МАН-1046",  from_city: "Актау",         to_city: "Алматы",      driver: DRIVERS[2], eta: "18ч 00м", progress: 24, status: "В пути" as const },
    { route_code: "МАН-1047",  from_city: "Актау",         to_city: "Атырау",      driver: DRIVERS[3], eta: "5ч 10м",  progress: 55, status: "В пути" as const },
  ]

  // ─── 8 клиентов ───────────────────────────────────────────────────────────
  const customers = [
    { name: "ТОО «КазМунайТранс»",       city: "Актау",    orders_count: 284, status: "Активный" as const, revenue: "₸ 142 млн" },
    { name: "АО «НМСК Казмортрансфлот»", city: "Актау",    orders_count: 196, status: "Активный" as const, revenue: "₸ 98 млн"  },
    { name: "ТОО «КаспийЛогистик»",      city: "Актау",    orders_count: 138, status: "Активный" as const, revenue: "₸ 67 млн"  },
    { name: "KTZE — KTZ Express",        city: "Астана",   orders_count: 112, status: "Активный" as const, revenue: "₸ 54 млн"  },
    { name: "АО «КазТрансОйл»",          city: "Актау",    orders_count:  89, status: "Активный" as const, revenue: "₸ 44 млн"  },
    { name: "ТОО «МангТрансОйл»",        city: "Жанаозен", orders_count:  74, status: "На паузе" as const, revenue: "₸ 31 млн"  },
    { name: "ТОО «АгроЭкспорт KZ»",      city: "Бейнеу",   orders_count:  61, status: "Активный" as const, revenue: "₸ 18 млн"  },
    { name: "ИП Джаксыбеков А.",         city: "Актау",    orders_count:  43, status: "Новый"    as const, revenue: "₸ 8,4 млн" },
  ]

  await Promise.all([
    supabase.from("orders").insert(orders.map(o => ({ ...o, user_id: user.id }))),
    supabase.from("vehicles").insert(vehicles.map(v => ({ ...v, user_id: user.id }))),
    supabase.from("routes").insert(routes.map(r => ({ ...r, user_id: user.id }))),
    supabase.from("customers").insert(customers.map(c => ({ ...c, user_id: user.id }))),
  ])

  revalidatePath("/dashboard", "layout")
}
