"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Демо-данные для нового аккаунта: заявки, автопарк, маршруты и клиенты
// по реальным направлениям внутри Мангистауской области.
//
// Ключевое: среди заявок намеренно заложена пара под матчинг обратной
// загрузки — груз Актау → Жанаозен и встречный Жанаозен → Актау в
// подходящем временном окне. На демо связка должна находиться железно.

const DRIVERS = ["Ахмет С.", "Батыр Ж.", "Нурлан Б.", "Арман Т.", "Серик К.", "Дауит М."]

/** Дата со сдвигом в днях от сегодня (отрицательный — в прошлое). */
function day(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().split("T")[0]
}

/** Момент времени: сегодня + `days` дней, час `hour` по времени Актау (UTC+5). */
function at(days: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setUTCHours(hour - 5, 0, 0, 0)
  return d.toISOString()
}

export async function ensureUserData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Идемпотентность — если данные уже есть, не трогаем
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .like("order_number", "МАН-%")

  if ((count ?? 0) > 0) return

  // Справочник НП: сопоставляем названия с id, чтобы не хардкодить числа
  const { data: settlements } = await supabase.from("settlements").select("id,name,lat,lng")
  const byName = new Map((settlements ?? []).map((s) => [s.name, s]))
  const id = (name: string) => byName.get(name)?.id ?? null
  const at_ = (name: string) => {
    const s = byName.get(name)
    return s ? { lat: Number(s.lat), lng: Number(s.lng) } : { lat: 43.6353, lng: 51.1682 }
  }

  // Чистим старое
  await Promise.all([
    supabase.from("orders").delete().eq("user_id", user.id),
    supabase.from("vehicles").delete().eq("user_id", user.id),
    supabase.from("routes").delete().eq("user_id", user.id),
    supabase.from("customers").delete().eq("user_id", user.id),
  ])

  // ─── Заявки ────────────────────────────────────────────────────────────────
  const orders = [
    // ── Доставленные: история для аналитики ──
    {
      order_number: "МАН-00131", cargo_type: "Продукты питания",
      status: "Доставлен" as const, weight: 3200, volume: 14, body_type: "refrigerator",
      from_settlement_id: id("Актау"), to_settlement_id: id("Жанаозен"),
      distance_km: 150.68, driver: DRIVERS[0], delivery_date: day(-28),
      sender_name: "ТОО «Каспий Фуд»", sender_phone: "+7 729 245 10 20",
      sender_address: "Актау, промзона, база №4",
      recipient_name: "Магазин «Береке»", recipient_phone: "+7 729 350 11 22",
      recipient_address: "Жанаозен, мкр Шанырак",
    },
    {
      order_number: "МАН-00132", cargo_type: "Стройматериалы",
      status: "Доставлен" as const, weight: 18000, volume: 24, body_type: "flatbed",
      from_settlement_id: id("Актау"), to_settlement_id: id("Шетпе"),
      distance_km: 162.85, driver: DRIVERS[1], delivery_date: day(-25),
      sender_name: "ТОО «Актауқұрылыс»", sender_phone: "+7 729 255 00 11",
      sender_address: "Актау, мкр 31, склад",
      recipient_name: "ИП Сарсенов", recipient_phone: "+7 729 331 44 55",
      recipient_address: "Шетпе, ул. Абая",
    },
    {
      order_number: "МАН-00133", cargo_type: "Питьевая вода",
      status: "Доставлен" as const, weight: 6400, volume: 18, body_type: "tent",
      from_settlement_id: id("Актау"), to_settlement_id: id("Таушык"),
      distance_km: 107.2, driver: DRIVERS[3], delivery_date: day(-19),
      sender_name: "ТОО «Ак Су»", sender_phone: "+7 729 240 77 88",
      sender_address: "Актау, мкр 27",
      recipient_name: "Сельский акимат Таушык", recipient_phone: "+7 729 338 00 12",
      recipient_address: "Таушык, центр",
    },
    {
      order_number: "МАН-00134", cargo_type: "Инертные материалы",
      status: "Доставлен" as const, weight: 20000, volume: 12, body_type: "dump",
      from_settlement_id: id("Жетыбай"), to_settlement_id: id("Жанаозен"),
      distance_km: 75.86, driver: DRIVERS[4], delivery_date: day(-12),
      sender_name: "Карьер «Жетібай»", sender_phone: "+7 729 320 55 66",
      sender_address: "Жетыбай, карьер",
      recipient_name: "ТОО «МангКурылыс»", recipient_phone: "+7 729 244 22 33",
      recipient_address: "Жанаозен, стройплощадка мкр 6",
    },

    // ── В пути ──
    {
      order_number: "МАН-00141", cargo_type: "Товары народного потребления",
      status: "В пути" as const, weight: 4100, volume: 22, body_type: "tent",
      from_settlement_id: id("Актау"), to_settlement_id: id("Акшукур"),
      distance_km: 23.79, driver: DRIVERS[2], delivery_date: day(0),
      sender_name: "ТОО «Мангистау Трейд»", sender_phone: "+7 729 260 30 40",
      sender_address: "Актау, оптовая база",
      recipient_name: "Магазин «Ақшұқыр»", recipient_phone: "+7 729 355 66 77",
      recipient_address: "Акшукур, ул. Достык",
    },
    {
      order_number: "МАН-00142", cargo_type: "Оборудование для промыслов",
      status: "В пути" as const, weight: 9800, volume: 16, body_type: "manipulator",
      from_settlement_id: id("Актау"), to_settlement_id: id("Каламкас"),
      distance_km: 279.67, driver: DRIVERS[5], delivery_date: day(1),
      sender_name: "ТОО «НефтеСервис МГ»", sender_phone: "+7 729 222 90 10",
      sender_address: "Актау, промзона",
      recipient_name: "Промысел Каламкас", recipient_phone: "+7 729 300 00 90",
      recipient_address: "Каламкас, вахтовый посёлок",
    },
    {
      order_number: "МАН-00143", cargo_type: "Комбикорм",
      status: "В пути" as const, weight: 7200, volume: 20, body_type: "tent",
      from_settlement_id: id("Актау"), to_settlement_id: id("Сенек"),
      distance_km: 200.22, driver: DRIVERS[1], delivery_date: day(1),
      sender_name: "ТОО «Агроснаб Актау»", sender_phone: "+7 729 277 12 13",
      sender_address: "Актау, база «Агро»",
      recipient_name: "КХ «Сенек»", recipient_phone: "+7 729 340 22 11",
      recipient_address: "Сенек, ферма",
    },

    // ── ГЛАВНАЯ ПАРА ПОД МАТЧИНГ ──
    // Прямой рейс: продукты в рефрижераторе Актау → Жанаозен, забрать завтра к 08:00
    {
      order_number: "МАН-00144", cargo_type: "Продукты питания",
      status: "Ожидает отправки" as const, weight: 3000, volume: 15, body_type: "refrigerator",
      from_settlement_id: id("Актау"), to_settlement_id: id("Жанаозен"),
      distance_km: 150.68, driver: null, delivery_date: day(1),
      pickup_from: at(1, 8), pickup_to: at(1, 11),
      sender_name: "ТОО «Каспий Фуд»", sender_phone: "+7 729 245 10 20",
      sender_address: "Актау, промзона, база №4",
      recipient_name: "Супермаркет «Аружан»", recipient_phone: "+7 729 351 88 99",
      recipient_address: "Жанаозен, мкр Самал",
    },
    // Встречный груз: Жанаозен → Актау, готов к 14:00 того же дня.
    // Подача 0 км, возврат в исходную точку — связка идеальная.
    {
      order_number: "МАН-00145", cargo_type: "Рыбная продукция",
      status: "Ожидает отправки" as const, weight: 2600, volume: 12, body_type: "refrigerator",
      from_settlement_id: id("Жанаозен"), to_settlement_id: id("Актау"),
      distance_km: 150.68, driver: null, delivery_date: day(1),
      pickup_from: at(1, 14), pickup_to: at(1, 18),
      sender_name: "ТОО «Озен Балык»", sender_phone: "+7 729 352 40 50",
      sender_address: "Жанаозен, холодильный склад",
      recipient_name: "Рынок «Шыгыс»", recipient_phone: "+7 729 246 70 80",
      recipient_address: "Актау, мкр 12, рынок",
    },

    // ── Остальная очередь: даёт альтернативы в подборе ──
    {
      order_number: "МАН-00146", cargo_type: "Стройматериалы",
      status: "Ожидает отправки" as const, weight: 14000, volume: 18, body_type: "flatbed",
      from_settlement_id: id("Актау"), to_settlement_id: id("Жанаозен"),
      distance_km: 150.68, driver: null, delivery_date: day(2),
      pickup_from: at(2, 7), pickup_to: at(2, 12),
      sender_name: "ТОО «Актауқұрылыс»", sender_phone: "+7 729 255 00 11",
      sender_address: "Актау, мкр 31, склад",
      recipient_name: "ТОО «МангКурылыс»", recipient_phone: "+7 729 244 22 33",
      recipient_address: "Жанаозен, стройплощадка мкр 6",
    },
    {
      order_number: "МАН-00147", cargo_type: "Мебель и бытовая техника",
      status: "Ожидает отправки" as const, weight: 2800, volume: 26, body_type: "tent",
      from_settlement_id: id("Жанаозен"), to_settlement_id: id("Актау"),
      distance_km: 150.68, driver: null, delivery_date: day(1),
      pickup_from: at(1, 16), pickup_to: at(1, 20),
      sender_name: "Салон «Уют»", sender_phone: "+7 729 353 10 10",
      sender_address: "Жанаозен, ТЦ «Орда»",
      recipient_name: "Склад «Мега Актау»", recipient_phone: "+7 729 249 20 30",
      recipient_address: "Актау, мкр 28",
    },
    {
      order_number: "МАН-00148", cargo_type: "Продукты питания",
      status: "Ожидает отправки" as const, weight: 1800, volume: 9, body_type: "refrigerator",
      from_settlement_id: id("Курык"), to_settlement_id: id("Актау"),
      distance_km: 71.02, driver: null, delivery_date: day(1),
      pickup_from: at(1, 13), pickup_to: at(1, 17),
      sender_name: "ИП Ералиев", sender_phone: "+7 729 336 55 44",
      sender_address: "Курык, рыбный цех",
      recipient_name: "Кафе «Достар»", recipient_phone: "+7 729 247 33 22",
      recipient_address: "Актау, мкр 15",
    },
    {
      order_number: "МАН-00149", cargo_type: "Инертные материалы",
      status: "Ожидает отправки" as const, weight: 19000, volume: 11, body_type: "dump",
      from_settlement_id: id("Шетпе"), to_settlement_id: id("Актау"),
      distance_km: 162.85, driver: null, delivery_date: day(2),
      pickup_from: at(2, 8), pickup_to: at(2, 14),
      sender_name: "Карьер «Шетпе»", sender_phone: "+7 729 332 11 00",
      sender_address: "Шетпе, карьер",
      recipient_name: "ТОО «Актау Бетон»", recipient_phone: "+7 729 258 90 00",
      recipient_address: "Актау, бетонный узел",
    },
    {
      order_number: "МАН-00150", cargo_type: "Питьевая вода",
      status: "Ожидает отправки" as const, weight: 5200, volume: 16, body_type: "tent",
      from_settlement_id: id("Актау"), to_settlement_id: id("Уштаган"),
      distance_km: 206.84, driver: null, delivery_date: day(3),
      pickup_from: at(3, 7), pickup_to: at(3, 11),
      sender_name: "ТОО «Ак Су»", sender_phone: "+7 729 240 77 88",
      sender_address: "Актау, мкр 27",
      recipient_name: "Сельский акимат Уштаган", recipient_phone: "+7 729 339 10 20",
      recipient_address: "Уштаган, центр",
    },
    {
      order_number: "МАН-00151", cargo_type: "Товары народного потребления",
      status: "Ожидает отправки" as const, weight: 3400, volume: 19, body_type: "tent",
      from_settlement_id: id("Актау"), to_settlement_id: id("Форт-Шевченко"),
      distance_km: 144.59, driver: null, delivery_date: day(2),
      pickup_from: at(2, 9), pickup_to: at(2, 13),
      sender_name: "ТОО «Мангистау Трейд»", sender_phone: "+7 729 260 30 40",
      sender_address: "Актау, оптовая база",
      recipient_name: "Магазин «Каспий»", recipient_phone: "+7 729 337 22 33",
      recipient_address: "Форт-Шевченко, ул. Кунанбаева",
    },
    {
      order_number: "МАН-00152", cargo_type: "Оборудование для промыслов",
      status: "Ожидает отправки" as const, weight: 11500, volume: 14, body_type: "manipulator",
      from_settlement_id: id("Жанаозен"), to_settlement_id: id("Жетыбай"),
      distance_km: 75.86, driver: null, delivery_date: day(2),
      pickup_from: at(2, 10), pickup_to: at(2, 15),
      sender_name: "ТОО «Озенмунайсервис»", sender_phone: "+7 729 354 60 70",
      sender_address: "Жанаозен, промбаза",
      recipient_name: "Промысел Жетыбай", recipient_phone: "+7 729 321 00 40",
      recipient_address: "Жетыбай, участок 3",
    },
  ]

  // ─── Автопарк ──────────────────────────────────────────────────────────────
  // Позиции машин разбросаны по области — от них считается порожняя подача.
  const vehicles = [
    {
      vehicle_code: "АКТ-01", plate: "A 123 BCA 16", driver: DRIVERS[0], status: "Свободна" as const,
      load_percent: 0, route: "—", body_type: "refrigerator", capacity_kg: 10000,
      home_settlement_id: id("Актау"), ...coords(at_("Актау")),
    },
    {
      vehicle_code: "АКТ-02", plate: "B 456 KMA 16", driver: DRIVERS[1], status: "Свободна" as const,
      load_percent: 0, route: "—", body_type: "tent", capacity_kg: 20000,
      home_settlement_id: id("Актау"), ...coords(at_("Актау")),
    },
    {
      vehicle_code: "АКТ-03", plate: "C 789 PHA 16", driver: DRIVERS[2], status: "В рейсе" as const,
      load_percent: 84, route: "Актау → Акшукур", body_type: "tent", capacity_kg: 20000,
      home_settlement_id: id("Актау"), ...coords(at_("Акшукур")),
    },
    {
      vehicle_code: "АКТ-04", plate: "H 321 EKA 16", driver: DRIVERS[3], status: "На ТО" as const,
      load_percent: 0, route: "Сервис, Актау", body_type: "dump", capacity_kg: 25000,
      home_settlement_id: id("Актау"), ...coords(at_("Актау")),
    },
    {
      vehicle_code: "ЖАН-05", plate: "M 654 OPA 16", driver: DRIVERS[4], status: "Свободна" as const,
      load_percent: 0, route: "—", body_type: "dump", capacity_kg: 25000,
      home_settlement_id: id("Жанаозен"), ...coords(at_("Жанаозен")),
    },
    {
      vehicle_code: "ЖАН-06", plate: "K 987 AXA 16", driver: DRIVERS[5], status: "Свободна" as const,
      load_percent: 0, route: "—", body_type: "refrigerator", capacity_kg: 5000,
      home_settlement_id: id("Жанаозен"), ...coords(at_("Жанаозен")),
    },
    {
      vehicle_code: "ШЕТ-07", plate: "P 147 CBA 16", driver: DRIVERS[0], status: "Свободна" as const,
      load_percent: 0, route: "—", body_type: "flatbed", capacity_kg: 20000,
      home_settlement_id: id("Шетпе"), ...coords(at_("Шетпе")),
    },
    {
      vehicle_code: "ЖЕТ-08", plate: "T 258 MHA 16", driver: DRIVERS[1], status: "В рейсе" as const,
      load_percent: 91, route: "Жетыбай → Жанаозен", body_type: "dump", capacity_kg: 25000,
      home_settlement_id: id("Жетыбай"), ...coords(at_("Жетыбай")),
    },
    {
      vehicle_code: "КУР-09", plate: "R 369 KTA 16", driver: DRIVERS[2], status: "Свободна" as const,
      load_percent: 0, route: "—", body_type: "refrigerator", capacity_kg: 5000,
      home_settlement_id: id("Курык"), ...coords(at_("Курык")),
    },
    {
      vehicle_code: "АКТ-10", plate: "S 741 BHA 16", driver: DRIVERS[3], status: "Свободна" as const,
      load_percent: 0, route: "—", body_type: "manipulator", capacity_kg: 12000,
      home_settlement_id: id("Актау"), ...coords(at_("Актау")),
    },
    {
      vehicle_code: "БЕЙ-11", plate: "N 852 OKA 16", driver: DRIVERS[4], status: "В рейсе" as const,
      load_percent: 72, route: "Шетпе → Бейнеу", body_type: "tent", capacity_kg: 20000,
      home_settlement_id: id("Бейнеу"), ...coords(at_("Бейнеу")),
    },
    {
      vehicle_code: "ФШ-12", plate: "L 963 PMA 16", driver: DRIVERS[5], status: "Свободна" as const,
      load_percent: 0, route: "—", body_type: "tent", capacity_kg: 10000,
      home_settlement_id: id("Форт-Шевченко"), ...coords(at_("Форт-Шевченко")),
    },
  ]

  // ─── Маршруты ─────────────────────────────────────────────────────────────
  const routes = [
    { route_code: "МАН-1041", from_city: "Актау",    to_city: "Акшукур",       driver: DRIVERS[2], eta: "25 мин",  progress: 84, status: "Завершается" as const },
    { route_code: "МАН-1042", from_city: "Актау",    to_city: "Каламкас",      driver: DRIVERS[5], eta: "6ч 00м",  progress: 38, status: "В пути" as const },
    { route_code: "МАН-1043", from_city: "Жетыбай",  to_city: "Жанаозен",      driver: DRIVERS[1], eta: "1ч 00м",  progress: 91, status: "Завершается" as const },
    { route_code: "МАН-1044", from_city: "Актау",    to_city: "Сенек",         driver: DRIVERS[1], eta: "2ч 55м",  progress: 46, status: "В пути" as const },
    { route_code: "МАН-1045", from_city: "Шетпе",    to_city: "Бейнеу",        driver: DRIVERS[4], eta: "3ч 38м",  progress: 72, status: "В пути" as const },
    { route_code: "МАН-1046", from_city: "Актау",    to_city: "Жанаозен",      driver: "—",        eta: "—",       progress: 0,  status: "Запланирован" as const },
  ]

  // ─── Клиенты ──────────────────────────────────────────────────────────────
  const customers = [
    { name: "ТОО «Каспий Фуд»",         city: "Актау",         orders_count: 184, status: "Активный" as const, revenue: "₸ 48 млн"  },
    { name: "ТОО «Актауқұрылыс»",       city: "Актау",         orders_count: 152, status: "Активный" as const, revenue: "₸ 41 млн"  },
    { name: "ТОО «Мангистау Трейд»",    city: "Актау",         orders_count: 137, status: "Активный" as const, revenue: "₸ 33 млн"  },
    { name: "ТОО «МангКурылыс»",        city: "Жанаозен",      orders_count:  98, status: "Активный" as const, revenue: "₸ 27 млн"  },
    { name: "ТОО «Озенмунайсервис»",    city: "Жанаозен",      orders_count:  76, status: "Активный" as const, revenue: "₸ 22 млн"  },
    { name: "ТОО «Ак Су»",              city: "Актау",         orders_count:  64, status: "На паузе" as const, revenue: "₸ 14 млн"  },
    { name: "КХ «Сенек»",               city: "Сенек",         orders_count:  31, status: "Новый"    as const, revenue: "₸ 5,2 млн" },
    { name: "Магазин «Каспий»",         city: "Форт-Шевченко", orders_count:  27, status: "Новый"    as const, revenue: "₸ 4,1 млн" },
  ]

  await Promise.all([
    supabase.from("orders").insert(orders.map((o) => ({ ...o, user_id: user.id }))),
    supabase.from("vehicles").insert(vehicles.map((v) => ({ ...v, user_id: user.id }))),
    supabase.from("routes").insert(routes.map((r) => ({ ...r, user_id: user.id }))),
    supabase.from("customers").insert(customers.map((c) => ({ ...c, user_id: user.id }))),
  ])

  revalidatePath("/dashboard", "layout")
}

/** Позиция машины с небольшим детерминированным разбросом внутри НП. */
function coords(base: { lat: number; lng: number }) {
  return { current_lat: base.lat, current_lng: base.lng }
}
