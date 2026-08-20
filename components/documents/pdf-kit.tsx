import { Text, View } from "@react-pdf/renderer"

import { doc, LINE, SOFT } from "@/lib/documents/pdf-theme"

// Кирпичики печатного бланка: рамочные таблицы, поля с подписью под чертой,
// пустые линии под заполнение от руки. Всё как в бумажной форме, из которой
// документ и вырос.

type Style = React.ComponentProps<typeof View>["style"]

/** Текст, склеенный из подстановок, приходит массивом строк — в react-pdf
 *  такие дети обязаны лежать внутри <Text>, иначе просто не отрисуются. */
function isText(children: React.ReactNode): boolean {
  const primitive = (c: React.ReactNode) => typeof c === "string" || typeof c === "number"
  if (primitive(children)) return true
  return Array.isArray(children) && children.every((c) => c == null || primitive(c))
}

export function Table({
  children,
  style,
  wrap = true,
}: {
  children: React.ReactNode
  style?: Style
  /** wrap={false} — таблицу нельзя разорвать между страницами. */
  wrap?: boolean
}) {
  return (
    <View style={[doc.table, style ?? {}]} wrap={wrap}>
      {children}
    </View>
  )
}

export function Row({
  children,
  head,
  style,
}: {
  children: React.ReactNode
  head?: boolean
  style?: Style
}) {
  return (
    <View style={[doc.row, head ? doc.rowHead : {}, style ?? {}]} wrap={false}>
      {children}
    </View>
  )
}

export function Cell({
  children,
  w,
  align,
  head,
  label,
  bold,
  caption,
  style,
}: {
  children?: React.ReactNode
  /** Ширина: строка — фиксированная доля, число — коэффициент flex. */
  w?: string | number
  align?: "left" | "center" | "right"
  head?: boolean
  /** Служебная колонка бланка — набирается серым. */
  label?: boolean
  bold?: boolean
  /** Пояснение мелким курсивом под значением: «(наименование, БИН, адрес)». */
  caption?: string
  style?: Style
}) {
  const width: Style =
    typeof w === "string" ? { width: w } : { flex: typeof w === "number" ? w : 1 }

  const textStyle = [
    head ? doc.cellHead : doc.cellText,
    label ? doc.label : {},
    bold ? doc.bold : {},
    align ? { textAlign: align } : {},
  ]

  return (
    <View style={[doc.cell, width, style ?? {}]}>
      {isText(children) ? <Text style={textStyle}>{children}</Text> : children}
      {caption ? <Text style={doc.caption}>{caption}</Text> : null}
    </View>
  )
}

/** Строка «поле — значение», из которых состоит верх любого бланка. */
export function Field({
  label,
  value,
  caption,
  labelWidth = "26%",
  children,
}: {
  label: string
  value?: string | number | null
  caption?: string
  labelWidth?: string
  children?: React.ReactNode
}) {
  return (
    <Row>
      <Cell w={labelWidth} label>
        {label}
      </Cell>
      <Cell caption={caption}>
        {children ?? <Text style={doc.cellText}>{value == null || value === "" ? "—" : value}</Text>}
      </Cell>
    </Row>
  )
}

/** Пустая линия под заполнение от руки. */
export function Blank({ w = 120 }: { w?: number | string }) {
  return <View style={[doc.blank, typeof w === "string" ? { width: w } : { width: w }]} />
}

export function SectionHead({ title, titleKz }: { title: string; titleKz?: string }) {
  return (
    <View style={doc.sectionHead}>
      <Text style={doc.sectionTitle}>{title}</Text>
      {titleKz ? <Text style={doc.sectionTitleKz}>{titleKz}</Text> : null}
    </View>
  )
}

/** Колонка подписи: линия, под ней расшифровка мелким шрифтом. */
export function SignatureSlot({ caption }: { caption: string }) {
  return (
    <View>
      <View style={doc.signLine} />
      <Text style={doc.signCaption}>{caption}</Text>
    </View>
  )
}

export { LINE, SOFT }
