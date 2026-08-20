import { Document, Page, Text, View } from "@react-pdf/renderer"

import { tengeInWords } from "@/lib/documents/amount-in-words"
import {
  blankDate,
  dateTime,
  duration,
  num,
  shortDate,
  time,
} from "@/lib/documents/format"
import { doc } from "@/lib/documents/pdf-theme"
import type { WaybillData } from "@/lib/documents/waybill"
import {
  Blank,
  Cell,
  Field,
  Row,
  SectionHead,
  SignatureSlot,
  Table,
} from "@/components/documents/pdf-kit"

// Товарно-транспортная накладная — печатный бланк.
//
// Свёрстан как бумажная форма: рамочные таблицы, пояснения под полями,
// сумма прописью, три подписи с местом печати. Всё, что платформа знает,
// подставлено; чего знать не может — БИН сторон, номер путевого листа,
// количество мест — оставлено пустым под ручку.

export function WaybillPdf({ data }: { data: WaybillData }) {
  const footer = `Документ № ${data.docId}, сформирован платформой Cargora ${dateTime(new Date())}.`

  const senderLine = [data.sender.address, data.sender.phone ? `тел. ${data.sender.phone}` : null]
    .filter(Boolean)
    .join(", ")
  const recipientLine = [
    data.recipient.address,
    data.recipient.phone ? `тел. ${data.recipient.phone}` : null,
  ]
    .filter(Boolean)
    .join(", ")

  // Район приписываем только сёлам: «Актау, Городская администрация район»
  // в бланке выглядит нелепо.
  const place = (name: string | null, district: string | null) => {
    if (!name) return "—"
    if (!district || district.startsWith("Городская")) return name
    return `${name}, ${district} район`
  }
  const fromLine = place(data.from, data.fromDistrict)
  const toLine = place(data.to, data.toDistrict)

  return (
    <Document
      title={`Товарно-транспортная накладная ${data.orderNumber}`}
      author="Cargora"
      subject={`Перевозка ${data.from ?? ""} — ${data.to ?? ""}`}
      creator="Cargora"
      producer="Cargora"
    >
      <Page size="A4" style={doc.page}>
        {/* ── Шапка ── */}
        <View style={doc.stampRow}>
          <Text style={doc.stampText}>Республика Казахстан · Мангистауская область</Text>
          <Text style={doc.stampText}>Экземпляр № ____</Text>
        </View>

        <Text style={doc.titleKz}>ТАУАР-КӨЛІК ЖҮКҚҰЖАТЫ</Text>
        <Text style={doc.title}>ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ</Text>
        <Text style={doc.subtitle}>
          № {data.orderNumber} от {blankDate(data.createdAt)}
        </Text>
        <View style={doc.rule} />
        <View style={doc.ruleThin} />

        {/* ── 1. Стороны ── */}
        <View style={doc.section}>
          <SectionHead title="1. Стороны перевозки" titleKz="Тасымалдау тараптары" />
          <Table>
            <Field label="Грузоотправитель" caption="наименование либо Ф.И.О., адрес, телефон">
              <View>
                <Text style={[doc.cellText, doc.bold]}>{data.sender.name ?? "—"}</Text>
                {senderLine ? <Text style={doc.cellText}>{senderLine}</Text> : null}
              </View>
            </Field>
            <Row>
              <Cell w="26%" label>
                БИН / ИИН
              </Cell>
              <Cell>
                <Blank w="45%" />
              </Cell>
            </Row>

            <Field label="Грузополучатель" caption="наименование либо Ф.И.О., адрес, телефон">
              <View>
                <Text style={[doc.cellText, doc.bold]}>{data.recipient.name ?? "—"}</Text>
                {recipientLine ? <Text style={doc.cellText}>{recipientLine}</Text> : null}
              </View>
            </Field>
            <Row>
              <Cell w="26%" label>
                БИН / ИИН
              </Cell>
              <Cell>
                <Blank w="45%" />
              </Cell>
            </Row>

            <Field label="Перевозчик" caption="наименование, БИН / ИИН, адрес, телефон">
              <Blank w="100%" />
            </Field>
          </Table>
        </View>

        {/* ── 2. Маршрут ── */}
        <View style={doc.section}>
          <SectionHead title="2. Маршрут перевозки" titleKz="Тасымалдау бағыты" />
          <Table>
            <Field label="Пункт погрузки" value={fromLine} />
            <Field label="Пункт разгрузки" value={toLine} />
            <Row>
              <Cell w="26%" label>
                Расстояние
              </Cell>
              <Cell caption="по автомобильным дорогам общего пользования">
                {data.km > 0 ? `${num(data.km, 1)} км` : "—"}
              </Cell>
              <Cell w="22%" label>
                Время в пути
              </Cell>
              <Cell w="20%">{duration(data.hours)}</Cell>
            </Row>
            <Row>
              <Cell w="26%" label>
                Дата и время подачи
              </Cell>
              <Cell>
                {data.pickupFrom
                  ? `${shortDate(data.pickupFrom)}, ${time(data.pickupFrom)}`
                  : "по согласованию сторон"}
              </Cell>
              <Cell w="22%" label>
                Срок доставки
              </Cell>
              <Cell w="20%">{data.deliveryDate ? shortDate(data.deliveryDate) : "—"}</Cell>
            </Row>
          </Table>
        </View>

        {/* ── 3. Груз ── */}
        <View style={doc.section}>
          <SectionHead title="3. Сведения о грузе" titleKz="Жүк туралы мәліметтер" />
          <Table>
            <Row head>
              <Cell w="6%" head align="center">
                №
              </Cell>
              <Cell head>Наименование груза</Cell>
              <Cell w="17%" head align="center">
                Тип кузова
              </Cell>
              <Cell w="13%" head align="center">
                Мест
              </Cell>
              <Cell w="17%" head align="center">
                Масса брутто, кг
              </Cell>
              <Cell w="13%" head align="center">
                Объём, м³
              </Cell>
            </Row>
            <Row>
              <Cell w="6%" align="center">
                1
              </Cell>
              <Cell bold>{data.cargoType}</Cell>
              <Cell w="17%" align="center">
                {data.bodyTypeLabel}
              </Cell>
              <Cell w="13%">
                <Blank w="100%" />
              </Cell>
              <Cell w="17%" align="right">
                {data.weightKg > 0 ? num(data.weightKg) : "—"}
              </Cell>
              <Cell w="13%" align="right">
                {data.volumeM3 != null ? num(data.volumeM3, 0) : "—"}
              </Cell>
            </Row>
            <Row>
              <Cell w="6%" align="center">
                2
              </Cell>
              <Cell>
                <Blank w="100%" />
              </Cell>
              <Cell w="17%">
                <Blank w="100%" />
              </Cell>
              <Cell w="13%">
                <Blank w="100%" />
              </Cell>
              <Cell w="17%">
                <Blank w="100%" />
              </Cell>
              <Cell w="13%">
                <Blank w="100%" />
              </Cell>
            </Row>
            <Row>
              <Cell w="6%" />
              <Cell bold align="right">
                Итого
              </Cell>
              <Cell w="17%" />
              <Cell w="13%" />
              <Cell w="17%" align="right" bold>
                {data.weightKg > 0 ? num(data.weightKg) : "—"}
              </Cell>
              <Cell w="13%" align="right" bold>
                {data.volumeM3 != null ? num(data.volumeM3, 0) : "—"}
              </Cell>
            </Row>
          </Table>
          <Text style={doc.note}>
            Масса нетто, вид упаковки, количество мест и особые отметки заполняются при погрузке.
          </Text>
        </View>

        {/* ── 4. Транспорт ── */}
        <View style={doc.section}>
          <SectionHead
            title="4. Транспортное средство и водитель"
            titleKz="Көлік құралы және жүргізуші"
          />
          <Table>
            <Row>
              <Cell w="26%" label>
                Государственный номер
              </Cell>
              <Cell bold>{data.plate ?? " "}</Cell>
              <Cell w="22%" label>
                Марка, модель
              </Cell>
              <Cell w="20%">
                <Blank w="100%" />
              </Cell>
            </Row>
            <Row>
              <Cell w="26%" label>
                Грузоподъёмность
              </Cell>
              <Cell>{data.capacityKg ? `${num(data.capacityKg / 1000, 1)} т` : "—"}</Cell>
              <Cell w="22%" label>
                Путевой лист №
              </Cell>
              <Cell w="20%">
                <Blank w="100%" />
              </Cell>
            </Row>
            <Row>
              <Cell w="26%" label>
                Водитель
              </Cell>
              <Cell caption="Ф.И.О., телефон">
                <Text style={[doc.cellText, doc.bold]}>
                  {data.driverName ?? "—"}
                  {data.driverPhone ? `, тел. ${data.driverPhone}` : ""}
                </Text>
              </Cell>
              <Cell w="22%" label>
                Категории
              </Cell>
              <Cell w="20%">{data.driverLicense ?? "—"}</Cell>
            </Row>
            <Row>
              <Cell w="26%" label>
                Водительское удостоверение №
              </Cell>
              <Cell>
                <Blank w="60%" />
              </Cell>
              <Cell w="22%" label>
                Прицеп / полуприцеп
              </Cell>
              <Cell w="20%">
                <Blank w="100%" />
              </Cell>
            </Row>
          </Table>
        </View>

        {/* ── 5. Стоимость ── */}
        <View style={doc.section} wrap={false}>
          <SectionHead title="5. Стоимость перевозки" titleKz="Тасымалдау құны" />
          <Table>
            <Row>
              <Cell w="60%" label>
                Тариф за километр, тенге
              </Cell>
              <Cell align="right">{num(data.ratePerKm)}</Cell>
            </Row>
            <Row>
              <Cell w="60%" label>
                Расстояние перевозки, км
              </Cell>
              <Cell align="right">{num(data.km, 1)}</Cell>
            </Row>
            <Row>
              <Cell w="60%" label>
                Расчётный расход топлива, л (дизельное топливо {data.fuelPrice} тенге/л)
              </Cell>
              <Cell align="right">{num(data.fuelLiters, 1)}</Cell>
            </Row>
            <Row>
              <Cell w="60%" bold>
                Стоимость перевозки, тенге
              </Cell>
              <Cell align="right" bold>
                {num(data.price)}
              </Cell>
            </Row>
            <Row>
              <Cell w="26%" label>
                Сумма прописью
              </Cell>
              <Cell>
                <Text style={[doc.cellText, doc.bold]}>{tengeInWords(data.price)}</Text>
              </Cell>
            </Row>
          </Table>
          <Text style={doc.note}>
            Расчёт справочный: тариф — среднерыночная ставка для данной грузоподъёмности, расход
            топлива — по норме для типа кузова. Окончательная сумма определяется договором сторон.
          </Text>
        </View>

        {/* ── 6. Подписи ── */}
        <View style={doc.section} wrap={false}>
          <SectionHead title="6. Приём и сдача груза" titleKz="Жүкті қабылдау және тапсыру" />
          <View style={doc.signGrid}>
            <View style={doc.signCol}>
              <Text style={doc.label}>Груз к перевозке сдал</Text>
              <SignatureSlot caption="подпись, Ф.И.О. грузоотправителя, дата и время" />
              <Text style={[doc.signCaption, { marginTop: 4 }]}>М.П.</Text>
            </View>
            <View style={doc.signCol}>
              <Text style={doc.label}>Груз к перевозке принял</Text>
              <SignatureSlot caption="подпись водителя, дата и время" />
              <Text style={[doc.signCaption, { marginTop: 4 }]}> </Text>
            </View>
            <View style={doc.signCol}>
              <Text style={doc.label}>Груз получил</Text>
              <SignatureSlot caption="подпись, Ф.И.О. грузополучателя, дата и время" />
              <Text style={[doc.signCaption, { marginTop: 4 }]}>М.П.</Text>
            </View>
          </View>

          <Text style={doc.note}>
            Экземпляр 1 — грузоотправителю, 2 — грузополучателю, 3 — перевозчику. Расстояние
            рассчитано по дорожному графу OpenStreetMap. {footer} Действителен при наличии
            подписей всех сторон.
          </Text>
        </View>

      </Page>
    </Document>
  )
}
