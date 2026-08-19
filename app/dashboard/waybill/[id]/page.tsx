import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import {
  BODY_TYPE_LABELS,
  DIESEL_PRICE_KZT,
  FUEL_CONSUMPTION,
  TRUCK_TIME_FACTOR,
  formatKzt,
  marketRatePerKm,
  type BodyType,
} from "@/lib/economics"
import { findDriver, fullName } from "@/lib/drivers"
import { PrintButton } from "@/components/print-button"

// Товарно-транспортная накладная по заявке.
//
// Собирается из данных, которые уже есть в системе: стороны с телефонами
// и адресами, груз, машина, водитель с категориями, плечо по дорожному
// графу и стоимость по рыночным ставкам. Поля, которых у платформы быть
// не может — БИН сторон, номер путевого листа — оставлены под заполнение
// от руки, как в бумажной форме.

export const dynamic = "force-dynamic"

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return "—"
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Aqtau",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d)
}

function fmtTime(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return "—"
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Aqtau",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

/** Пустая линия под заполнение от руки. */
function Blank({ width = "100%" }: { width?: string }) {
  return (
    <span
      className="inline-block border-b border-dotted border-current align-baseline"
      style={{ width, minWidth: "60px" }}
    />
  )
}

export default async function WaybillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const orderId = Number(id)
  if (!Number.isFinite(orderId)) notFound()

  const supabase = await createClient()

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle()

  if (!order) notFound()

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
  const fuelLiters = (km * FUEL_CONSUMPTION[bodyType]) / 100

  return (
    <div className="mx-auto max-w-[860px] p-6 print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-lg font-semibold">Товарно-транспортная накладная</h1>
          <p className="text-sm text-muted-foreground">
            Заявка {order.order_number} · распечатайте или сохраните в PDF
          </p>
        </div>
        <PrintButton />
      </div>

      <article className="report space-y-5 text-[12.5px] leading-normal">
        {/* ── Шапка ── */}
        <header className="border-b-2 pb-3 text-center">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Республика Казахстан · Мангистауская область
          </p>
          <h2 className="mt-1 text-xl font-bold">Товарно-транспортная накладная</h2>
          <p className="mt-1">
            № <span className="font-semibold">{order.order_number}</span> от{" "}
            <span className="font-semibold">{fmtDate(order.created_at)}</span>
          </p>
        </header>

        {/* ── 1. Стороны ── */}
        <section className="break-inside-avoid">
          <h3 className="mb-2 border-b pb-1 text-[13px] font-bold">1. Стороны перевозки</h3>

          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b align-top">
                <td className="w-[130px] py-1.5 pr-3 text-muted-foreground">Грузоотправитель</td>
                <td className="py-1.5">
                  <div className="font-medium">{order.sender_name ?? "—"}</div>
                  <div className="text-muted-foreground">
                    {order.sender_address ?? "—"}
                    {order.sender_phone ? ` · тел. ${order.sender_phone}` : ""}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    БИН / ИИН <Blank width="180px" />
                  </div>
                </td>
              </tr>

              <tr className="border-b align-top">
                <td className="py-1.5 pr-3 text-muted-foreground">Грузополучатель</td>
                <td className="py-1.5">
                  <div className="font-medium">{order.recipient_name ?? "—"}</div>
                  <div className="text-muted-foreground">
                    {order.recipient_address ?? "—"}
                    {order.recipient_phone ? ` · тел. ${order.recipient_phone}` : ""}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    БИН / ИИН <Blank width="180px" />
                  </div>
                </td>
              </tr>

              <tr className="border-b align-top">
                <td className="py-1.5 pr-3 text-muted-foreground">Перевозчик</td>
                <td className="py-1.5">
                  <div className="font-medium">
                    {driver ? "ИП / ТОО" : "—"} <Blank width="220px" />
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    БИН / ИИН <Blank width="180px" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── 2. Маршрут ── */}
        <section className="break-inside-avoid">
          <h3 className="mb-2 border-b pb-1 text-[13px] font-bold">2. Маршрут перевозки</h3>

          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b">
                <td className="w-[130px] py-1.5 pr-3 text-muted-foreground">Пункт погрузки</td>
                <td className="py-1.5 font-medium">
                  {from?.name ?? "—"}
                  {from?.district ? `, ${from.district} район` : ""}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-3 text-muted-foreground">Пункт разгрузки</td>
                <td className="py-1.5 font-medium">
                  {to?.name ?? "—"}
                  {to?.district ? `, ${to.district} район` : ""}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-3 text-muted-foreground">Расстояние</td>
                <td className="py-1.5 font-medium tabular-nums">
                  {km > 0 ? `${km.toFixed(2)} км` : "—"}
                  <span className="ml-2 font-normal text-muted-foreground">
                    по автомобильным дорогам общего пользования
                  </span>
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-3 text-muted-foreground">Время в пути</td>
                <td className="py-1.5 font-medium tabular-nums">
                  {hours > 0 ? `${Math.floor(hours)} ч ${Math.round((hours % 1) * 60)} мин` : "—"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-3 text-muted-foreground">Дата и время подачи</td>
                <td className="py-1.5 font-medium">
                  {fmtDate(order.pickup_from)}
                  {order.pickup_from ? `, ${fmtTime(order.pickup_from)}` : ""}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-3 text-muted-foreground">Срок доставки</td>
                <td className="py-1.5 font-medium">{fmtDate(order.delivery_date)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── 3. Груз ── */}
        <section className="break-inside-avoid">
          <h3 className="mb-2 border-b pb-1 text-[13px] font-bold">3. Сведения о грузе</h3>

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 text-left">
                <th className="py-1.5 pr-2 font-semibold">Наименование груза</th>
                <th className="py-1.5 px-2 text-right font-semibold">Масса брутто, кг</th>
                <th className="py-1.5 px-2 text-right font-semibold">Объём, м³</th>
                <th className="py-1.5 pl-2 text-left font-semibold">Тип кузова</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-2 font-medium">{order.cargo_type}</td>
                <td className="py-2 px-2 text-right tabular-nums">
                  {weightKg > 0 ? weightKg.toLocaleString("ru-RU") : "—"}
                </td>
                <td className="py-2 px-2 text-right tabular-nums">{order.volume ?? "—"}</td>
                <td className="py-2 pl-2">{BODY_TYPE_LABELS[bodyType]}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-2 text-muted-foreground">Количество мест</td>
                <td className="py-1.5 px-2 text-right" colSpan={3}>
                  <Blank width="120px" />
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mt-2 text-muted-foreground">
            Масса нетто, вид упаковки и особые отметки — заполняются при погрузке.
          </p>
        </section>

        {/* ── 4. Транспорт ── */}
        <section className="break-inside-avoid">
          <h3 className="mb-2 border-b pb-1 text-[13px] font-bold">
            4. Транспортное средство и водитель
          </h3>

          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b">
                <td className="w-[130px] py-1.5 pr-3 text-muted-foreground">Государственный номер</td>
                <td className="py-1.5 font-medium">{vehicle?.plate ?? <Blank width="160px" />}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-3 text-muted-foreground">Марка, модель</td>
                <td className="py-1.5"><Blank width="220px" /></td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-3 text-muted-foreground">Грузоподъёмность</td>
                <td className="py-1.5 font-medium tabular-nums">
                  {vehicle?.capacity_kg ? `${(vehicle.capacity_kg / 1000).toFixed(1)} т` : "—"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-3 text-muted-foreground">Водитель</td>
                <td className="py-1.5">
                  <span className="font-medium">{driver ? fullName(driver) : "—"}</span>
                  {driver ? (
                    <span className="text-muted-foreground"> · тел. {driver.phone}</span>
                  ) : null}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-3 text-muted-foreground">Категории</td>
                <td className="py-1.5 font-medium">{driver?.license ?? "—"}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-3 text-muted-foreground">Удостоверение №</td>
                <td className="py-1.5"><Blank width="200px" /></td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-3 text-muted-foreground">Путевой лист №</td>
                <td className="py-1.5"><Blank width="200px" /></td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── 5. Стоимость ── */}
        <section className="break-inside-avoid">
          <h3 className="mb-2 border-b pb-1 text-[13px] font-bold">5. Стоимость перевозки</h3>

          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b">
                <td className="w-[200px] py-1.5 pr-3 text-muted-foreground">
                  Тариф, ₸ за километр
                </td>
                <td className="py-1.5 text-right font-medium tabular-nums">
                  {marketRatePerKm(capacity).toLocaleString("ru-RU")}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-3 text-muted-foreground">Расстояние, км</td>
                <td className="py-1.5 text-right font-medium tabular-nums">{km.toFixed(2)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-3 text-muted-foreground">
                  Расчётный расход топлива, л
                </td>
                <td className="py-1.5 text-right tabular-nums">{fuelLiters.toFixed(1)}</td>
              </tr>
              <tr className="border-b-2">
                <td className="py-2 pr-3 font-semibold">Стоимость перевозки, ₸</td>
                <td className="py-2 text-right text-[15px] font-bold tabular-nums">
                  {price.toLocaleString("ru-RU")}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mt-2 text-muted-foreground">
            Расчёт справочный. Тариф — среднерыночная ставка для данной грузоподъёмности,
            расход топлива — по норме для типа кузова при цене дизеля {DIESEL_PRICE_KZT} ₸/л.
            Окончательная сумма определяется договором сторон.
          </p>
        </section>

        {/* ── 6. Подписи ── */}
        <section className="break-inside-avoid pt-2">
          <h3 className="mb-3 border-b pb-1 text-[13px] font-bold">6. Приём и сдача груза</h3>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="mb-6 text-muted-foreground">Груз сдал</p>
              <div className="border-b" />
              <p className="mt-1 text-[11px] text-muted-foreground">подпись, ФИО</p>
              <div className="mt-4 border-b" />
              <p className="mt-1 text-[11px] text-muted-foreground">дата, время</p>
            </div>

            <div>
              <p className="mb-6 text-muted-foreground">Груз принял к перевозке</p>
              <div className="border-b" />
              <p className="mt-1 text-[11px] text-muted-foreground">подпись водителя</p>
              <div className="mt-4 border-b" />
              <p className="mt-1 text-[11px] text-muted-foreground">дата, время</p>
            </div>

            <div>
              <p className="mb-6 text-muted-foreground">Груз получил</p>
              <div className="border-b" />
              <p className="mt-1 text-[11px] text-muted-foreground">подпись, ФИО</p>
              <div className="mt-4 border-b" />
              <p className="mt-1 text-[11px] text-muted-foreground">дата, время</p>
            </div>
          </div>

          <p className="mt-5 text-[11px] text-muted-foreground">
            Накладная сформирована автоматически платформой Cargora из данных заявки
            {" "}{order.order_number}. Расстояние рассчитано по дорожному графу
            OpenStreetMap. Документ действителен при наличии подписей всех сторон.
          </p>
        </section>
      </article>
    </div>
  )
}
