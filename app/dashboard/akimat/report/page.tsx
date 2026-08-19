import { createClient } from "@/lib/supabase/server"
import {
  BASELINE_EMPTY_RUN_SHARE,
  DIESEL_PRICE_KZT,
  DRIVER_HOURLY_KZT,
  FUEL_CONSUMPTION,
  MATCHING_REDUCTION,
  REGION_TRUCK_COUNT,
  formatKzt,
} from "@/lib/economics"
import { REGION_AREA_KM2 } from "@/lib/mangystau"
import { PrintButton } from "@/components/print-button"

// Аналитическая записка для акимата — печатная версия дашборда.
//
// Отдельная страница, а не модальное окно: чиновнику нужен документ,
// который можно сохранить в PDF, приложить к письму и распечатать.
// Печать делается штатным window.print(), без библиотек — стили
// под печать заданы в globals.css.

export const dynamic = "force-dynamic"

const GAP_DAYS = 7

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Aqtau",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d)
}

export default async function AkimatReportPage() {
  const supabase = await createClient()

  const [settlementsRes, ordersRes, matrixRes] = await Promise.all([
    supabase.from("settlements").select("id,name,district,population,is_remote").order("id"),
    supabase
      .from("orders")
      .select("id,from_settlement_id,to_settlement_id,weight,status,created_at,empty_km_saved,tenge_saved,distance_km"),
    supabase.from("distance_matrix").select("from_id,to_id,km"),
  ])

  const settlements = settlementsRes.data ?? []
  const orders = ordersRes.data ?? []
  const names = new Map(settlements.map((s) => [s.id, s.name]))
  const kmByPair = new Map((matrixRes.data ?? []).map((m) => [`${m.from_id}-${m.to_id}`, Number(m.km)]))

  // ── Грузопотоки ──
  const flows = new Map<string, { from: string; to: string; count: number; tons: number; km: number }>()
  for (const o of orders) {
    if (o.from_settlement_id == null || o.to_settlement_id == null) continue
    const key = `${o.from_settlement_id}-${o.to_settlement_id}`
    const cur = flows.get(key)
    const tons = Number(o.weight ?? 0) / 1000
    if (cur) {
      cur.count += 1
      cur.tons += tons
    } else {
      flows.set(key, {
        from: names.get(o.from_settlement_id) ?? "—",
        to: names.get(o.to_settlement_id) ?? "—",
        count: 1,
        tons,
        km: kmByPair.get(key) ?? 0,
      })
    }
  }
  const topFlows = [...flows.values()].sort((a, b) => b.count - a.count)

  // ── Итоги ──
  const totalTons = orders.reduce((s, o) => s + Number(o.weight ?? 0), 0) / 1000
  const totalKm = orders.reduce((s, o) => s + Number(o.distance_km ?? 0), 0)
  const savedKm = orders.reduce((s, o) => s + Number(o.empty_km_saved ?? 0), 0)
  const savedKzt = orders.reduce((s, o) => s + Number(o.tenge_saved ?? 0), 0)

  // ── Разрывы снабжения ──
  const now = Date.now()
  const lastByTo = new Map<number, number>()
  for (const o of orders) {
    if (o.to_settlement_id == null) continue
    const t = new Date(o.created_at as string).getTime()
    const cur = lastByTo.get(o.to_settlement_id)
    if (!cur || t > cur) lastByTo.set(o.to_settlement_id, t)
  }

  const gaps = settlements
    .filter((s) => s.is_remote)
    .map((s) => {
      const last = lastByTo.get(s.id)
      const days = last ? Math.floor((now - last) / 86_400_000) : null
      return { ...s, days }
    })
    .filter((s) => s.days === null || s.days > GAP_DAYS)

  // ── Потенциал по области ──
  const share = 0.1
  const legKm = 120
  const tripsPerDay = 1.5
  const activeTrucks = REGION_TRUCK_COUNT * share
  const potentialKmPerDay = activeTrucks * tripsPerDay * BASELINE_EMPTY_RUN_SHARE * MATCHING_REDUCTION * legKm
  const potentialKztPerDay = potentialKmPerDay * (FUEL_CONSUMPTION.tent / 100) * DIESEL_PRICE_KZT

  return (
    <div className="mx-auto max-w-[820px] p-6 print:p-0">
      {/* Кнопка исчезает при печати */}
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <article className="report space-y-6 text-[13px] leading-relaxed">
        {/* ── Шапка ── */}
        <header className="border-b pb-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Аналитическая записка
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            Грузоперевозки внутри Мангистауской области
          </h1>
          <p className="mt-1 text-muted-foreground">
            Данные цифровой платформы Cargora · по состоянию на {fmtDate(new Date())}
          </p>
        </header>

        {/* ── 1. Общие сведения ── */}
        <section>
          <h2 className="mb-2 text-base font-bold">1. Общие сведения</h2>
          <table className="w-full border-collapse">
            <tbody>
              {[
                ["Площадь области", `${REGION_AREA_KM2.toLocaleString("ru-RU")} км²`],
                ["Населённых пунктов на платформе", String(settlements.length)],
                ["Из них отдалённых", String(settlements.filter((s) => s.is_remote).length)],
                ["Грузовых автомобилей в области", `${REGION_TRUCK_COUNT.toLocaleString("ru-RU")} (БНС на 01.03.2026)`],
                ["Перевозок в системе", String(orders.length)],
                ["Перевезено груза", `${totalTons.toFixed(1)} т`],
                ["Совокупный пробег с грузом", `${Math.round(totalKm).toLocaleString("ru-RU")} км`],
              ].map(([k, v]) => (
                <tr key={k} className="border-b">
                  <td className="py-1.5 pr-4 text-muted-foreground">{k}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── 2. Грузопотоки ── */}
        <section className="break-inside-avoid">
          <h2 className="mb-2 text-base font-bold">2. Грузопотоки по направлениям</h2>
          {topFlows.length === 0 ? (
            <p className="text-muted-foreground">Данных за период недостаточно.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 text-left">
                  <th className="py-1.5 font-semibold">Направление</th>
                  <th className="py-1.5 text-right font-semibold">Плечо, км</th>
                  <th className="py-1.5 text-right font-semibold">Перевозок</th>
                  <th className="py-1.5 text-right font-semibold">Тонн</th>
                </tr>
              </thead>
              <tbody>
                {topFlows.map((f, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-1.5">{f.from} → {f.to}</td>
                    <td className="py-1.5 text-right tabular-nums">{Math.round(f.km) || "—"}</td>
                    <td className="py-1.5 text-right tabular-nums">{f.count}</td>
                    <td className="py-1.5 text-right tabular-nums">{f.tons.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* ── 3. Снабжение отдалённых пунктов ── */}
        <section className="break-inside-avoid">
          <h2 className="mb-2 text-base font-bold">3. Снабжение отдалённых населённых пунктов</h2>
          {gaps.length === 0 ? (
            <p>
              Разрывов снабжения не выявлено: во все отдалённые пункты доставки выполнялись
              в течение последних {GAP_DAYS} суток.
            </p>
          ) : (
            <>
              <p className="mb-2">
                Выявлено {gaps.length} населённых пунктов, в которые доставки не выполнялись
                более {GAP_DAYS} суток либо не выполнялись вовсе:
              </p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 text-left">
                    <th className="py-1.5 font-semibold">Населённый пункт</th>
                    <th className="py-1.5 font-semibold">Район</th>
                    <th className="py-1.5 text-right font-semibold">Население</th>
                    <th className="py-1.5 text-right font-semibold">Последняя доставка</th>
                  </tr>
                </thead>
                <tbody>
                  {gaps.map((g) => (
                    <tr key={g.id} className="border-b">
                      <td className="py-1.5">{g.name}</td>
                      <td className="py-1.5 text-muted-foreground">{g.district ?? "—"}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {g.population ? g.population.toLocaleString("ru-RU") : "—"}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {g.days === null ? "не выполнялась" : `${g.days} сут. назад`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        {/* ── 4. Экономический эффект ── */}
        <section className="break-inside-avoid">
          <h2 className="mb-2 text-base font-bold">4. Экономический эффект</h2>

          <p className="mb-2">
            Платформа автоматически подбирает перевозчику обратную загрузку, за счёт чего
            сокращается порожний пробег. Фактически достигнуто:
          </p>

          <table className="mb-3 w-full border-collapse">
            <tbody>
              <tr className="border-b">
                <td className="py-1.5 pr-4 text-muted-foreground">Порожний пробег сокращён</td>
                <td className="py-1.5 text-right font-medium tabular-nums">
                  {Math.round(savedKm).toLocaleString("ru-RU")} км
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-4 text-muted-foreground">Экономия перевозчиков</td>
                <td className="py-1.5 text-right font-medium tabular-nums">{formatKzt(savedKzt)}</td>
              </tr>
            </tbody>
          </table>

          <p className="mb-2">
            Расчёт потенциала при охвате {Math.round(share * 100)}% автопарка области,
            среднем плече {legKm} км и {tripsPerDay} рейсах в сутки на машину:
          </p>

          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b">
                <td className="py-1.5 pr-4 text-muted-foreground">Активных машин</td>
                <td className="py-1.5 text-right font-medium tabular-nums">
                  {Math.round(activeTrucks).toLocaleString("ru-RU")}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-4 text-muted-foreground">Порожний пробег устраняется</td>
                <td className="py-1.5 text-right font-medium tabular-nums">
                  {Math.round(potentialKmPerDay).toLocaleString("ru-RU")} км/сутки
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-4 text-muted-foreground">Экономия топлива</td>
                <td className="py-1.5 text-right font-medium tabular-nums">
                  {formatKzt(potentialKztPerDay)} в сутки
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-4 font-medium">В годовом выражении</td>
                <td className="py-1.5 text-right font-bold tabular-nums">
                  {formatKzt(potentialKztPerDay * 365)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── 5. Методика ── */}
        <section className="break-inside-avoid">
          <h2 className="mb-2 text-base font-bold">5. Методика и источники</h2>
          <ul className="list-inside list-disc space-y-1 text-[12px] text-muted-foreground">
            <li>
              Расстояния между населёнными пунктами рассчитаны по дорожному графу
              OpenStreetMap (маршрутизатор OSRM), 210 пар направлений.
            </li>
            <li>
              Доля порожнего пробега 25,8% — Eurostat, 2024, внутренние автомобильные
              перевозки ЕС. Собственных исследований по Республике Казахстан не публиковалось.
            </li>
            <li>
              Снижение порожнего пробега при автоматическом подборе обратной загрузки — 20%.
              Документированные значения: Convoy Automated Reloads −19%, Uber Freight −22,6%.
            </li>
            <li>
              Цена дизельного топлива {DIESEL_PRICE_KZT} ₸/л — мониторинг АЗС РК, август 2026.
              Норма расхода тентованного полуприцепа 20 т — {FUEL_CONSUMPTION.tent} л/100 км.
            </li>
            <li>
              Стоимость часа водителя {DRIVER_HOURLY_KZT.toLocaleString("ru-RU")} ₸ выведена из
              средней заработной платы по области 608 400 ₸ (БНС, I квартал 2026).
            </li>
            <li>
              Численность населения населённых пунктов — данные OpenStreetMap, приводятся
              как порядок величины: по большинству сёл сведения отстают от фактических.
            </li>
          </ul>
        </section>

        {/* ── Подпись ── */}
        <footer className="border-t pt-4 text-[12px] text-muted-foreground">
          <p>
            Записка сформирована автоматически из данных платформы. Цифры воспроизводимы:
            исходные расчёты и источники приведены в разделе 5.
          </p>
          <div className="mt-8 flex justify-between">
            <div>
              <div className="h-8 w-56 border-b" />
              <p className="mt-1">подпись</p>
            </div>
            <div>
              <div className="h-8 w-40 border-b" />
              <p className="mt-1">дата</p>
            </div>
          </div>
        </footer>
      </article>
    </div>
  )
}
