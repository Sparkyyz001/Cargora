import { createClient } from "@/lib/supabase/server"
import {
  BODY_TYPE_LABELS,
  DIESEL_PRICE_KZT,
  FUEL_CONSUMPTION,
  TRUCK_TIME_FACTOR,
  marketRatePerKm,
  type BodyType,
} from "@/lib/economics"
import { findDriver, fullName } from "@/lib/drivers"

// Данные товарно-транспортной накладной.
//
// Собираются из того, что уже есть в системе: стороны с телефонами и
// адресами, груз, машина, водитель, плечо по дорожному графу и стоимость
// по рыночным ставкам. Поля, которых у платформы быть не может — БИН
// сторон, номер путевого листа, — в бланке остаются пустыми под ручку.

export type WaybillData = {
  orderId: number
  orderNumber: string
  createdAt: string
  docId: string

  sender: { name: string | null; address: string | null; phone: string | null }
  recipient: { name: string | null; address: string | null; phone: string | null }

  from: string | null
  to: string | null
  fromDistrict: string | null
  toDistrict: string | null
  km: number
  hours: number
  pickupFrom: string | null
  deliveryDate: string | null

  cargoType: string
  weightKg: number
  volumeM3: number | null
  bodyTypeLabel: string

  plate: string | null
  capacityKg: number | null
  driverName: string | null
  driverPhone: string | null
  driverLicense: string | null

  ratePerKm: number
  fuelLiters: number
  fuelPrice: number
  price: number
}

/** Короткий идентификатор документа — печатается в подвале бланка. */
function documentId(orderNumber: string, createdAt: string): string {
  let hash = 0
  for (const ch of `${orderNumber}|${createdAt}`) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  }
  const code = hash.toString(36).toUpperCase().padStart(7, "0").slice(-7)
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

export async function loadWaybill(orderId: number): Promise<WaybillData | null> {
  const supabase = await createClient()

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle()

  if (!order) return null

  const [{ data: settlements }, { data: leg }, { data: vehicles }] = await Promise.all([
    supabase.from("settlements").select("id,name,district"),
    supabase
      .from("distance_matrix")
      .select("km,minutes")
      .eq("from_id", order.from_settlement_id ?? -1)
      .eq("to_id", order.to_settlement_id ?? -1)
      .maybeSingle(),
    supabase.from("vehicles").select("plate,vehicle_code,driver,body_type,capacity_kg"),
  ])

  const byId = new Map((settlements ?? []).map((s) => [s.id, s]))
  const from = byId.get(order.from_settlement_id ?? -1)
  const to = byId.get(order.to_settlement_id ?? -1)

  const km = Number(leg?.km ?? order.distance_km ?? 0)
  const hours = leg?.minutes ? (leg.minutes / 60) * TRUCK_TIME_FACTOR : 0

  const bodyType = (order.body_type ?? "tent") as BodyType
  const driver = findDriver(order.driver)
  const vehicle = (vehicles ?? []).find((v) => v.driver && driver && v.driver === driver.key)

  const weightKg = Number(order.weight ?? 0)
  const capacity = vehicle?.capacity_kg ?? weightKg
  const price =
    Number(order.price_kzt ?? 0) || Math.round((km * marketRatePerKm(capacity)) / 100) * 100

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    createdAt: order.created_at,
    docId: documentId(order.order_number, order.created_at),

    sender: {
      name: order.sender_name ?? null,
      address: order.sender_address ?? null,
      phone: order.sender_phone ?? null,
    },
    recipient: {
      name: order.recipient_name ?? null,
      address: order.recipient_address ?? null,
      phone: order.recipient_phone ?? null,
    },

    from: from?.name ?? null,
    to: to?.name ?? null,
    fromDistrict: from?.district ?? null,
    toDistrict: to?.district ?? null,
    km,
    hours,
    pickupFrom: order.pickup_from ?? null,
    deliveryDate: order.delivery_date ?? null,

    cargoType: order.cargo_type,
    weightKg,
    volumeM3: order.volume ?? null,
    bodyTypeLabel: BODY_TYPE_LABELS[bodyType],

    plate: vehicle?.plate ?? null,
    capacityKg: vehicle?.capacity_kg ?? null,
    driverName: driver ? fullName(driver) : null,
    driverPhone: driver?.phone ?? null,
    driverLicense: driver?.license ?? null,

    ratePerKm: marketRatePerKm(capacity),
    fuelLiters: (km * FUEL_CONSUMPTION[bodyType]) / 100,
    fuelPrice: DIESEL_PRICE_KZT,
    price,
  }
}
