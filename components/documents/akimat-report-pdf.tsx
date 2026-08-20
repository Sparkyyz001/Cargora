import { Document, Page, Text, View } from "@react-pdf/renderer"

import type { AkimatReportData } from "@/lib/documents/akimat-report"
import { GAP_DAYS } from "@/lib/documents/akimat-report"
import { blankDate, dateTime, kzt, longDate, num } from "@/lib/documents/format"
import { doc } from "@/lib/documents/pdf-theme"
import { Cell, Row, SectionHead, SignatureSlot, Table } from "@/components/documents/pdf-kit"

// Аналитическая записка для акимата — печатная версия дашборда «Грузопотоки
// области». Свёрстана как служебный документ: адресат в правом верхнем углу,
// исходящий номер, нумерованные разделы, методика в конце, подпись и
// исполнитель. Такую записку можно приложить к письму, не переписывая.

/** Сколько направлений печатать в таблице, остальное — строкой «прочие». */
const FLOW_ROWS = 14

export function AkimatReportPdf({ data }: { data: AkimatReportData }) {
  const footer = `Записка сформирована платформой Cargora ${dateTime(data.generatedAt)}.`

  const flows = data.flows.slice(0, FLOW_ROWS)
  const rest = data.flows.slice(FLOW_ROWS)
  const restCount = rest.reduce((s, f) => s + f.count, 0)
  const restTons = rest.reduce((s, f) => s + f.tons, 0)

  return (
    <Document
      title="Аналитическая записка о грузоперевозках Мангистауской области"
      author="Cargora"
      subject="Грузовые автомобильные перевозки внутри Мангистауской области"
      creator="Cargora"
      producer="Cargora"
    >
      <Page size="A4" style={doc.page}>
        {/* ── Адресат ── */}
        <View style={{ alignItems: "flex-end", marginBottom: 10 }}>
          <View style={{ width: "52%" }}>
            <Text style={doc.cellText}>В акимат Мангистауской области</Text>
            <Text style={doc.cellText}>Управление пассажирского транспорта</Text>
            <Text style={doc.cellText}>и автомобильных дорог</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={doc.stampText}>Исх. № ________</Text>
          <Text style={doc.stampText}>от {blankDate(data.generatedAt)}</Text>
        </View>

        {/* ── Заголовок ── */}
        <View style={{ marginTop: 10 }}>
          <Text style={doc.titleKz}>ТАЛДАМАЛЫҚ ЖАЗБА</Text>
          <Text style={doc.title}>АНАЛИТИЧЕСКАЯ ЗАПИСКА</Text>
          <Text style={doc.subtitle}>
            о грузовых автомобильных перевозках внутри Мангистауской области
          </Text>
          <Text style={[doc.stampText, { textAlign: "center", marginTop: 2 }]}>
            по данным цифровой платформы Cargora на {longDate(data.generatedAt)}
          </Text>
        </View>
        <View style={doc.rule} />
        <View style={doc.ruleThin} />

        {/* ── 1. Общие сведения ── */}
        <View style={doc.section}>
          <SectionHead title="1. Общие сведения" titleKz="Жалпы мәліметтер" />
          <Table wrap={false}>
            {(
              [
                ["Площадь области", `${num(data.areaKm2)} км²`],
                ["Населённых пунктов в справочнике платформы", num(data.settlementsCount)],
                ["Из них отдалённых", num(data.remoteCount)],
                [
                  "Грузовых автомобилей в области",
                  `${num(data.regionTrucks)} (БНС, на 01.03.2026)`,
                ],
                ["Перевозок учтено", num(data.ordersCount)],
                ["Перевезено груза", `${num(data.totalTons, 1)} т`],
                ["Совокупный пробег с грузом", `${num(Math.round(data.totalKm))} км`],
              ] as [string, string][]
            ).map(([k, v]) => (
              <Row key={k}>
                <Cell w="62%" label>
                  {k}
                </Cell>
                <Cell align="right" bold>
                  {v}
                </Cell>
              </Row>
            ))}
          </Table>
        </View>

        {/* ── 2. Грузопотоки ── */}
        <View style={doc.section}>
          <SectionHead title="2. Грузопотоки по направлениям" titleKz="Бағыттар бойынша жүк ағыны" />
          {flows.length === 0 ? (
            <Text style={doc.paragraph}>Данных за период недостаточно.</Text>
          ) : (
            <Table>
              <Row head>
                <Cell w="8%" head align="center">
                  №
                </Cell>
                <Cell head>Направление</Cell>
                <Cell w="18%" head align="center">
                  Плечо, км
                </Cell>
                <Cell w="18%" head align="center">
                  Перевозок
                </Cell>
                <Cell w="18%" head align="center">
                  Тонн
                </Cell>
              </Row>
              {flows.map((f, i) => (
                <Row key={`${f.from}-${f.to}`}>
                  <Cell w="8%" align="center">
                    {i + 1}
                  </Cell>
                  <Cell>{`${f.from} — ${f.to}`}</Cell>
                  <Cell w="18%" align="right">
                    {f.km > 0 ? num(Math.round(f.km)) : "—"}
                  </Cell>
                  <Cell w="18%" align="right">
                    {num(f.count)}
                  </Cell>
                  <Cell w="18%" align="right">
                    {num(f.tons, 1)}
                  </Cell>
                </Row>
              ))}
              {rest.length > 0 ? (
                <Row>
                  <Cell w="8%" />
                  <Cell label>{`Прочие направления (${rest.length})`}</Cell>
                  <Cell w="18%" align="right">
                    —
                  </Cell>
                  <Cell w="18%" align="right">
                    {num(restCount)}
                  </Cell>
                  <Cell w="18%" align="right">
                    {num(restTons, 1)}
                  </Cell>
                </Row>
              ) : null}
            </Table>
          )}
        </View>

        {/* ── 3. Снабжение отдалённых пунктов ── */}
        <View style={doc.section}>
          <SectionHead
            title="3. Снабжение отдалённых населённых пунктов"
            titleKz="Шалғай елді мекендерді жабдықтау"
          />
          {data.gaps.length === 0 ? (
            <Text style={doc.paragraph}>
              Разрывов снабжения не выявлено: во все отдалённые населённые пункты доставки
              выполнялись в течение последних {GAP_DAYS} суток.
            </Text>
          ) : (
            <>
              <Text style={doc.paragraph}>
                Выявлено {data.gaps.length} населённых пунктов, в которые доставки не выполнялись
                более {GAP_DAYS} суток либо не выполнялись вовсе:
              </Text>
              <Table>
                <Row head>
                  <Cell head>Населённый пункт</Cell>
                  <Cell w="26%" head>
                    Район
                  </Cell>
                  <Cell w="18%" head align="center">
                    Население
                  </Cell>
                  <Cell w="22%" head align="center">
                    Последняя доставка
                  </Cell>
                </Row>
                {data.gaps.map((g) => (
                  <Row key={g.name}>
                    <Cell>{g.name}</Cell>
                    <Cell w="26%" label>
                      {g.district ?? "—"}
                    </Cell>
                    <Cell w="18%" align="right">
                      {g.population ? num(g.population) : "—"}
                    </Cell>
                    <Cell w="22%" align="right">
                      {g.days === null ? "не выполнялась" : `${num(g.days)} сут. назад`}
                    </Cell>
                  </Row>
                ))}
              </Table>
              <Text style={doc.note}>
                Отсутствие доставок в населённый пункт — прямой признак разрыва в снабжении:
                товары туда завозятся попутно, нерегулярно и по завышенной цене.
              </Text>
            </>
          )}
        </View>

        {/* ── 4. Экономический эффект ── */}
        <View style={doc.section}>
          <SectionHead title="4. Экономический эффект" titleKz="Экономикалық тиімділік" />
          <Text style={doc.paragraph}>
            Платформа автоматически подбирает перевозчику обратную загрузку, за счёт чего
            сокращается порожний пробег. Фактически достигнуто по учтённым связкам:
          </Text>
          <Table wrap={false}>
            <Row>
              <Cell w="62%" label>
                Порожний пробег сокращён
              </Cell>
              <Cell align="right" bold>
                {`${num(Math.round(data.savedKm))} км`}
              </Cell>
            </Row>
            <Row>
              <Cell w="62%" label>
                Экономия перевозчиков
              </Cell>
              <Cell align="right" bold>
                {kzt(data.savedKzt)}
              </Cell>
            </Row>
          </Table>

          <Text style={[doc.paragraph, { marginTop: 6 }]}>
            Расчёт потенциала при охвате {Math.round(data.scenario.share * 100)}% автопарка
            области, среднем плече {data.scenario.legKm} км и {data.scenario.tripsPerDay} рейсах в
            сутки на машину:
          </Text>
          <Table wrap={false}>
            <Row>
              <Cell w="62%" label>
                Активных машин
              </Cell>
              <Cell align="right">{num(Math.round(data.scenario.activeTrucks))}</Cell>
            </Row>
            <Row>
              <Cell w="62%" label>
                Порожний пробег устраняется
              </Cell>
              <Cell align="right">{`${num(Math.round(data.scenario.kmPerDay))} км/сутки`}</Cell>
            </Row>
            <Row>
              <Cell w="62%" label>
                Экономия топлива
              </Cell>
              <Cell align="right">{`${kzt(data.scenario.kztPerDay)} в сутки`}</Cell>
            </Row>
            <Row>
              <Cell w="62%" bold>
                В годовом выражении
              </Cell>
              <Cell align="right" bold>
                {kzt(data.scenario.kztPerYear)}
              </Cell>
            </Row>
          </Table>
        </View>

        {/* ── 5. Методика ── */}
        <View style={doc.section}>
          <SectionHead title="5. Методика и источники" titleKz="Әдістеме және дереккөздер" />
          {[
            "Расстояния между населёнными пунктами рассчитаны по дорожному графу OpenStreetMap (маршрутизатор OSRM), 210 пар направлений.",
            `Доля порожнего пробега ${num(data.constants.emptyRunShare * 100, 1)}% — Eurostat, 2024, внутренние автомобильные перевозки ЕС. Собственных исследований по Республике Казахстан не публиковалось.`,
            `Снижение порожнего пробега при автоматическом подборе обратной загрузки — ${num(data.constants.matchingReduction * 100)}%. Документированные значения: Convoy Automated Reloads −19%, Uber Freight −22,6%.`,
            `Цена дизельного топлива ${data.constants.dieselPrice} тенге/л — мониторинг АЗС РК, август 2026. Норма расхода тентованного полуприцепа 20 т — ${data.constants.fuelConsumption} л/100 км.`,
            `Стоимость часа водителя ${num(data.constants.driverHourly)} тенге выведена из средней заработной платы по области 608 400 тенге (БНС, I квартал 2026).`,
            "Численность населения — данные OpenStreetMap, приводятся как порядок величины: по большинству сёл сведения отстают от фактических.",
          ].map((line, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 2.5 }}>
              <Text style={[doc.note, { width: 14, marginTop: 0 }]}>{`5.${i + 1}`}</Text>
              <Text style={[doc.note, { flex: 1, marginTop: 0, textAlign: "justify" }]}>{line}</Text>
            </View>
          ))}
        </View>

        {/* ── Подпись ── */}
        <View style={[doc.section, { marginTop: 14 }]} wrap={false}>
          <Text style={doc.note}>
            {footer} Цифры воспроизводимы: допущения и источники приведены в разделе 5.
          </Text>
          <View style={[doc.signGrid, { marginTop: 14 }]}>
            <View style={doc.signCol}>
              <Text style={doc.label}>Руководитель проекта Cargora</Text>
              <SignatureSlot caption="подпись, Ф.И.О." />
            </View>
            <View style={doc.signCol}>
              <Text style={doc.label}>Дата</Text>
              <SignatureSlot caption="число, месяц, год" />
            </View>
          </View>
          <Text style={[doc.note, { marginTop: 10 }]}>
            Исполнитель: _______________________ тел.: _______________________ М.П.
          </Text>
        </View>

      </Page>
    </Document>
  )
}
