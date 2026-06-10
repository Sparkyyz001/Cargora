"use server"

import { createClient } from "@/lib/supabase/server"

export type LandRoute = {
  id: number
  route_code: string
  from_city: string
  to_city: string
  carrier: string | null
  cargo: string | null
  vehicle: string | null
  status: "В пути" | "Ожидает отправки" | "Доставлен"
  distance: string | null
  eta: string | null
  progress: number
  waypoints: [number, number][]  // [lng, lat][]
  created_at: string
}

// ── Точные GPS-координаты по реальным трассам Казахстана ──────────
// формат: [lng, lat] — порядок 2ГИС MapGL
// A29: Актау → Бейнеу, A31: Бейнеу → Актобе/Атырау, A27: Бейнеу → Арал → Кызылорда

const WP = {
  // A29: Актау → Бейнеу (330 км)
  a29: [
    [51.1726, 43.6539], // Актау, старт
    [51.3500, 43.6350], // выезд на восток, пост ДПС
    [51.5500, 43.6000], // трасса A29, равнина
    [51.7800, 43.5750], // степь, нефтепромыслы
    [51.9600, 43.5550], // перед Жетыбаем
    [52.0974, 43.5461], // Жетыбай — пересечение дорог ★
    [52.1050, 43.5900], // поворот на север
    [52.1200, 43.7200], // A29 на север
    [52.1300, 43.9500], // степь
    [52.1433, 44.1792], // Шетпе — населённый пункт ★
    [52.2200, 44.3500], // после Шетпе, поворот на СВ
    [52.4500, 44.5500], // степь
    [52.7800, 44.7500], // степь
    [53.1500, 44.9000], //
    [53.5500, 45.0500], //
    [54.0000, 45.2000], // степь, перед Бейнеу
    [54.5500, 45.2800], //
    [55.1971, 45.3180], // Бейнеу — главная развязка A29/A31/A27 ★
  ] as [number, number][],

  // A31: Бейнеу → Атырау (через Кульсары)
  beineu_atyrau: [
    [55.1971, 45.3180], // Бейнеу ★
    [55.0800, 45.4500], // A31 на север-СЗ
    [54.9500, 45.6500], //
    [54.8200, 45.9000], // поворот на запад
    [54.6500, 46.1500], // степь
    [54.4500, 46.4000], //
    [54.2500, 46.6500], //
    [54.0248, 47.0173], // Кульсары ★
    [53.8500, 47.2500], //
    [53.5800, 47.4500], //
    [53.3304, 47.6455], // Макат ★
    [53.1500, 47.6200], //
    [52.9200, 47.5500], // Доссор
    [52.6000, 47.4000], // трасса к Атырау
    [52.3000, 47.2500], //
    [52.0000, 47.1800], //
    [51.8830, 47.1164], // Атырау ★
  ] as [number, number][],

  // A31: Бейнеу → Эмба → Актобе
  beineu_aktobe: [
    [55.1971, 45.3180], // Бейнеу ★
    [55.5500, 45.5500], // A31 восток
    [56.0500, 45.7500], //
    [56.5000, 46.0000], //
    [57.0000, 46.3500], //
    [57.3500, 46.8000], //
    [57.6500, 47.3000], //
    [57.8500, 47.9000], //
    [58.0500, 48.4000], //
    [58.1340, 48.8190], // Эмба (Дос) ★
    [58.0500, 49.0500], //
    [57.9000, 49.3500], //
    [57.7000, 49.7000], //
    [57.5000, 50.0000], //
    [57.3500, 50.1500], // въезд в Актобе
    [57.2094, 50.2839], // Актобе ★
  ] as [number, number][],

  // A27: Бейнеу → Аральск → Кызылорда
  beineu_kyzylorda: [
    [55.1971, 45.3180], // Бейнеу ★
    [55.9500, 45.4500], // A27 на восток
    [56.7000, 45.5500], //
    [57.5000, 45.6000], //
    [58.3500, 45.6500], //
    [59.2000, 45.7500], //
    [60.0500, 45.9500], //
    [60.8000, 46.2500], //
    [61.3000, 46.5500], //
    [61.6720, 46.7990], // Аральск ★
    [62.2000, 46.6000], // после Аральска, на ЮВ
    [62.9000, 46.2500], //
    [63.6000, 45.9000], //
    [64.2500, 45.5000], //
    [64.8000, 45.2000], //
    [65.2000, 45.0000], //
    [65.5092, 44.8528], // Кызылорда ★
  ] as [number, number][],

  // A17: Кызылорда → Шымкент
  kyzylorda_shymkent: [
    [65.5092, 44.8528], // Кызылорда ★
    [66.0000, 44.5500], // A17 на юг
    [66.5000, 44.2000], //
    [67.0000, 43.8500], // Сузак
    [67.4000, 43.4500], //
    [67.8000, 43.0500], // Шардара развязка
    [68.3000, 42.8000], //
    [68.9000, 42.6000], //
    [69.5901, 42.3000], // Шымкент ★
  ] as [number, number][],

  // A2: Шымкент → Тараз → Алматы
  shymkent_almaty: [
    [69.5901, 42.3000], // Шымкент ★
    [69.9500, 42.3500], // объездная А2 на восток
    [70.4000, 42.4000], // Сарыагаш
    [71.0000, 42.5000], //
    [71.6000, 42.5500], //
    [72.3000, 42.6500], //
    [72.9000, 42.8500], // Тараз ★
    [73.6000, 42.9000], //
    [74.2000, 42.9500], //
    [74.9000, 43.0500], //
    [75.5000, 43.1200], //
    [76.1500, 43.1800], //
    [76.5500, 43.2000], //
    [76.8897, 43.2389], // Алматы ★
  ] as [number, number][],

  // Актобе → Астана (через Тургай, Аркалык)
  aktobe_astana: [
    [57.2094, 50.2839], // Актобе ★
    [57.9000, 50.5500], // выезд на восток
    [58.8000, 50.8000], //
    [59.8000, 51.0000], //
    [61.0000, 51.1000], // Торгай степь
    [62.3000, 51.1500], //
    [63.5000, 51.2000], // Аркалык ★
    [65.0000, 51.1500], //
    [66.5000, 51.1500], //
    [68.0000, 51.2000], //
    [69.5000, 51.2000], //
    [71.0000, 51.1800], //
    [71.4704, 51.1605], // Астана ★
  ] as [number, number][],
}

// ── Готовые маршруты (A29+) ──────────────────────────────────────
const ROUTE_WAYPOINTS = {
  aktau_atyrau:    [...WP.a29, ...WP.beineu_atyrau.slice(1)],
  aktau_aktobe:    [...WP.a29, ...WP.beineu_aktobe.slice(1)],
  aktau_astana:    [...WP.a29, ...WP.beineu_aktobe.slice(1), ...WP.aktobe_astana.slice(1)],
  aktau_kyzylorda: [...WP.a29, ...WP.beineu_kyzylorda.slice(1)],
  aktau_almaty:    [...WP.a29, ...WP.beineu_kyzylorda.slice(1), ...WP.kyzylorda_shymkent.slice(1), ...WP.shymkent_almaty.slice(1)],
}

// ── Seed payload ──────────────────────────────────────────────────
type SeedRow = Omit<LandRoute, "id" | "created_at"> & { user_id: string }

function buildSeed(userId: string): Omit<SeedRow, "id" | "created_at">[] {
  return [
    {
      user_id: userId,
      route_code: "ЗЛ-00101",
      from_city: "Актау", to_city: "Атырау",
      carrier: "ТОО «КазМунайТранс»",
      cargo: "Нефтепродукты (светлые), 18 т",
      vehicle: "163 MAN TGX 02",
      status: "В пути",
      distance: "460 км", eta: "8 ч 20 мин",
      progress: 0.62,
      waypoints: ROUTE_WAYPOINTS.aktau_atyrau,
    },
    {
      user_id: userId,
      route_code: "ЗЛ-00102",
      from_city: "Актау", to_city: "Актобе",
      carrier: "KTZE — KTZ Express",
      cargo: "Металлопрокат, арматура 18 т",
      vehicle: "051 Scania R450 04",
      status: "В пути",
      distance: "785 км", eta: "13 ч 10 мин",
      progress: 0.44,
      waypoints: ROUTE_WAYPOINTS.aktau_aktobe,
    },
    {
      user_id: userId,
      route_code: "ЗЛ-00103",
      from_city: "Актау", to_city: "Астана",
      carrier: "ТОО «КаспийЛогистик»",
      cargo: "Контейнер 20 фут, ТНП",
      vehicle: "337 Volvo FH 07",
      status: "В пути",
      distance: "2 050 км", eta: "1 д 14 ч",
      progress: 0.29,
      waypoints: ROUTE_WAYPOINTS.aktau_astana,
    },
    {
      user_id: userId,
      route_code: "ЗЛ-00104",
      from_city: "Актау", to_city: "Кызылорда",
      carrier: "ТОО «МангТрансОйл»",
      cargo: "Нефтехимическая продукция",
      vehicle: "728 DAF XF 99",
      status: "Ожидает отправки",
      distance: "1 780 км", eta: "1 д 6 ч",
      progress: 0,
      waypoints: ROUTE_WAYPOINTS.aktau_kyzylorda,
    },
    {
      user_id: userId,
      route_code: "ЗЛ-00105",
      from_city: "Актау", to_city: "Алматы",
      carrier: "АО «КазТрансОйл»",
      cargo: "Продукты питания, сборный",
      vehicle: "481 Mercedes Actros 11",
      status: "Доставлен",
      distance: "2 820 км", eta: "Доставлено",
      progress: 1.0,
      waypoints: ROUTE_WAYPOINTS.aktau_almaty,
    },
  ]
}

// ── Server actions ────────────────────────────────────────────────

export async function getLandRoutes(): Promise<LandRoute[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("land_routes")
    .select("*")
    .order("route_code", { ascending: true })

  if (error) {
    console.error("getLandRoutes:", error.message)
    return []
  }

  // Auto-seed if empty
  if (!data || data.length === 0) {
    await seedLandRoutes()
    const { data: seeded } = await supabase
      .from("land_routes")
      .select("*")
      .order("route_code", { ascending: true })
    return (seeded ?? []) as LandRoute[]
  }

  return data as LandRoute[]
}

export async function seedLandRoutes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Не авторизован" }

  // Check if already seeded by this user
  const { count } = await supabase
    .from("land_routes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  if ((count ?? 0) > 0) return { success: true, skipped: true }

  const rows = buildSeed(user.id)
  const { error } = await supabase.from("land_routes").insert(rows)
  if (error) return { error: error.message }
  return { success: true }
}
