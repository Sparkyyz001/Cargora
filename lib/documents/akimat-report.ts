import { createClient } from "@/lib/supabase/server"
import {
  BASELINE_EMPTY_RUN_SHARE,
  DIESEL_PRICE_KZT,
  DRIVER_HOURLY_KZT,
  FUEL_CONSUMPTION,
  MATCHING_REDUCTION,
  REGION_TRUCK_COUNT,
} from "@/lib/economics"
import { DEMO_BASELINE } from "@/lib/demo-baseline"
import { REGION_AREA_KM2, SETTLEMENTS } from "@/lib/mangystau"

// Данные аналитической записки для акимата.
//
// Считаются ровно по той же схеме, что и дашборд «Грузопотоки области»:
// демо-подложка плюс реальные заявки. Иначе записка и экран показывали бы
// разные цифры, и первый же вопрос был бы про это.

/** Разрыв снабжения: столько суток без доставки уже считается сигналом. */
export const GAP_DAYS = 7

/** Допущения расчёта потенциала — вынесены сюда, чтобы печатались в записке. */
export const SCENARIO = { share: 0.1, legKm: 120, tripsPerDay: 1.5 }

export type Flow = { from: string; to: string; count: number; tons: number; km: number }
export type Gap = {
  name: string
  district: string | null
  population: number | null
  days: number | null
}

export type AkimatReportData = {
  generatedAt: string
  areaKm2: number
  settlementsCount: number
  remoteCount: number
  regionTrucks: number

  ordersCount: number
  totalTons: number
  totalKm: number
  savedKm: number
  savedKzt: number

  flows: Flow[]
  gaps: Gap[]

  scenario: {
    share: number
    legKm: number
    tripsPerDay: number
    activeTrucks: number
    kmPerDay: number
    kztPerDay: number
    kztPerYear: number
  }

  constants: {
    dieselPrice: number
    fuelConsumption: number
    driverHourly: number
    emptyRunShare: number
    matchingReduction: number
  }
}

type SettlementRow = {
  id: number
  name: string
  district: string | null
  population: number | null
  is_remote: boolean | null
}

export async function loadAkimatReport(): Promise<AkimatReportData> {
  const supabase = await createClient()

  const [settlementsRes, ordersRes, matrixRes] = await Promise.all([
    supabase.from("settlements").select("id,name,district,population,is_remote").order("id"),
    supabase
      .from("orders")
      .select(
        "id,from_settlement_id,to_settlement_id,weight,status,created_at,empty_km_saved,tenge_saved,distance_km",
      ),
    supabase.from("distance_matrix").select("from_id,to_id,km"),
  ])

  // Если справочник ещё не залит миграцией, берём его из кода: записка
  // всё равно должна печататься с полной картиной области.
  const settlements: SettlementRow[] =
    settlementsRes.data && settlementsRes.data.length > 0
      ? settlementsRes.data
      : SETTLEMENTS.map((s, i) => ({
          id: i + 1,
          name: s.name,
          district: s.district,
          population: s.population,
          is_remote: s.is_remote,
        }))

  const orders = ordersRes.data ?? []
  const nameById = new Map(settlements.map((s) => [s.id, s.name]))
  const idByName = new Map(settlements.map((s) => [s.name, s.id]))
  const kmByPair = new Map(
    (matrixRes.data ?? []).map((m) => [`${m.from_id}-${m.to_id}`, Number(m.km)]),
  )

  const legKm = (fromName: string | null, toName: string | null): number => {
    const a = fromName ? idByName.get(fromName) : undefined
    const b = toName ? idByName.get(toName) : undefined
    if (a == null || b == null) return 0
    return kmByPair.get(`${a}-${b}`) ?? kmByPair.get(`${b}-${a}`) ?? 0
  }

  // ── Грузопотоки: реальные заявки и подложка в одной таблице ──
  const flows = new Map<string, Flow>()
  const addFlow = (fromName: string | null, toName: string | null, weightKg: number) => {
    if (!fromName || !toName) return
    const key = `${fromName}→${toName}`
    const tons = weightKg / 1000
    const cur = flows.get(key)
    if (cur) {
      cur.count += 1
      cur.tons += tons
    } else {
      flows.set(key, { from: fromName, to: toName, count: 1, tons, km: legKm(fromName, toName) })
    }
  }

  for (const o of orders) {
    addFlow(
      o.from_settlement_id != null ? nameById.get(o.from_settlement_id) ?? null : null,
      o.to_settlement_id != null ? nameById.get(o.to_settlement_id) ?? null : null,
      Number(o.weight ?? 0),
    )
  }
  for (const o of DEMO_BASELINE) {
    addFlow(o.sender_address, o.recipient_address, Number(o.weight ?? 0))
  }

  const flowList = [...flows.values()].sort((a, b) => b.count - a.count)

  // ── Итоги ──
  const ordersCount = orders.length + DEMO_BASELINE.length
  const realTons = orders.reduce((s, o) => s + Number(o.weight ?? 0), 0) / 1000
  const baseTons = DEMO_BASELINE.reduce((s, o) => s + Number(o.weight ?? 0), 0) / 1000
  const realKm = orders.reduce((s, o) => s + Number(o.distance_km ?? 0), 0)
  const baseKm = DEMO_BASELINE.reduce(
    (s, o) => s + legKm(o.sender_address, o.recipient_address),
    0,
  )

  // Экономия — только по реальным связкам обратной загрузки: подложка
  // не должна приписывать платформе несуществующий эффект.
  const savedKm = orders.reduce((s, o) => s + Number(o.empty_km_saved ?? 0), 0)
  const savedKzt = orders.reduce((s, o) => s + Number(o.tenge_saved ?? 0), 0)

  // ── Разрывы снабжения ──
  const now = Date.now()
  const lastByName = new Map<string, number>()
  const touch = (name: string | null, iso: string | null | undefined) => {
    if (!name || !iso) return
    const t = new Date(iso).getTime()
    if (!Number.isFinite(t)) return
    const cur = lastByName.get(name)
    if (!cur || t > cur) lastByName.set(name, t)
  }
  for (const o of orders) {
    touch(
      o.to_settlement_id != null ? nameById.get(o.to_settlement_id) ?? null : null,
      o.created_at as string,
    )
  }
  for (const o of DEMO_BASELINE) touch(o.recipient_address, o.created_at)

  const gaps: Gap[] = settlements
    .filter((s) => s.is_remote)
    .map((s) => {
      const last = lastByName.get(s.name)
      return {
        name: s.name,
        district: s.district,
        population: s.population,
        days: last ? Math.floor((now - last) / 86_400_000) : null,
      }
    })
    .filter((g) => g.days === null || g.days > GAP_DAYS)
    .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999))

  // ── Потенциал по области ──
  const activeTrucks = REGION_TRUCK_COUNT * SCENARIO.share
  const kmPerDay =
    activeTrucks *
    SCENARIO.tripsPerDay *
    BASELINE_EMPTY_RUN_SHARE *
    MATCHING_REDUCTION *
    SCENARIO.legKm
  const kztPerDay = kmPerDay * (FUEL_CONSUMPTION.tent / 100) * DIESEL_PRICE_KZT

  return {
    generatedAt: new Date().toISOString(),
    areaKm2: REGION_AREA_KM2,
    settlementsCount: settlements.length,
    remoteCount: settlements.filter((s) => s.is_remote).length,
    regionTrucks: REGION_TRUCK_COUNT,

    ordersCount,
    totalTons: realTons + baseTons,
    totalKm: realKm + baseKm,
    savedKm,
    savedKzt,

    flows: flowList,
    gaps,

    scenario: {
      ...SCENARIO,
      activeTrucks,
      kmPerDay,
      kztPerDay,
      kztPerYear: kztPerDay * 365,
    },

    constants: {
      dieselPrice: DIESEL_PRICE_KZT,
      fuelConsumption: FUEL_CONSUMPTION.tent,
      driverHourly: DRIVER_HOURLY_KZT,
      emptyRunShare: BASELINE_EMPTY_RUN_SHARE,
      matchingReduction: MATCHING_REDUCTION,
    },
  }
}
