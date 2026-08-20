import fs from "node:fs"
import path from "node:path"

import { Font, StyleSheet } from "@react-pdf/renderer"

// Оформление печатных документов.
//
// Гарнитура Tinos — метрически совместима с Times New Roman и покрывает
// кириллицу вместе с казахскими буквами (ә, ғ, қ, ң, ө, ұ, ү, һ, і) и знаком
// тенге. Файлы лежат в assets/, а не в public/: наружу их отдавать незачем,
// они нужны только серверу, который собирает PDF.

const FONT_DIR = path.join(process.cwd(), "assets", "fonts")

let registered = false

export function registerDocumentFonts() {
  if (registered) return
  // Проверяем наличие файла явно: без шрифта react-pdf молча уходит на
  // Helvetica и вся кириллица превращается в пустые квадраты.
  const regular = path.join(FONT_DIR, "Tinos-Regular.ttf")
  if (!fs.existsSync(regular)) {
    throw new Error(`Шрифт документа не найден: ${regular}`)
  }

  Font.register({
    family: "Tinos",
    fonts: [
      { src: regular, fontWeight: 400 },
      { src: path.join(FONT_DIR, "Tinos-Bold.ttf"), fontWeight: 700 },
      { src: path.join(FONT_DIR, "Tinos-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
    ],
  })

  // Переносов по слогам в бланках не делают, а встроенный алгоритм
  // рассчитан на английский и рвёт русские слова наугад.
  Font.registerHyphenationCallback((word) => [word])

  registered = true
}

export const INK = "#111111"
export const LINE = "#000000"
export const SOFT = "#4a4a4a"
export const FILL = "#eeeeee"

export const doc = StyleSheet.create({
  page: {
    fontFamily: "Tinos",
    fontSize: 8.4,
    color: INK,
    lineHeight: 1.3,
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 30,
  },

  // ── Шапка ──
  stampRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  stampText: { fontSize: 7.4, color: SOFT },
  title: { fontSize: 12.5, fontWeight: 700, textAlign: "center", letterSpacing: 0.6 },
  titleKz: { fontSize: 9.4, fontWeight: 700, textAlign: "center", letterSpacing: 0.4, color: SOFT },
  subtitle: { fontSize: 9.6, textAlign: "center", marginTop: 4 },
  rule: { borderBottomWidth: 1.4, borderColor: LINE, marginTop: 6 },
  ruleThin: { borderBottomWidth: 0.5, borderColor: LINE, marginTop: 1.4 },

  // ── Разделы ──
  section: { marginTop: 6 },
  sectionTitle: { fontSize: 9, fontWeight: 700 },
  sectionTitleKz: { fontSize: 7.6, color: SOFT, fontStyle: "italic" },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 3,
  },

  // ── Таблицы ──
  table: { borderTopWidth: 0.7, borderLeftWidth: 0.7, borderColor: LINE },
  row: { flexDirection: "row", alignItems: "stretch" },
  rowHead: { backgroundColor: FILL },
  cell: {
    borderRightWidth: 0.7,
    borderBottomWidth: 0.7,
    borderColor: LINE,
    paddingVertical: 2.1,
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  cellText: { fontSize: 8.4 },
  cellHead: { fontSize: 8, fontWeight: 700 },
  label: { fontSize: 8.4, color: SOFT },
  caption: { fontSize: 6.8, color: SOFT, fontStyle: "italic", marginTop: 1 },

  // ── Прочее ──
  note: { fontSize: 7.6, color: SOFT, marginTop: 4 },
  paragraph: { fontSize: 8.8, marginBottom: 4, textAlign: "justify" },
  bold: { fontWeight: 700 },
  blank: { borderBottomWidth: 0.6, borderColor: LINE, height: 9 },

  // ── Подписи ──
  signGrid: { flexDirection: "row", gap: 14, marginTop: 6 },
  signCol: { flex: 1 },
  signLine: { borderBottomWidth: 0.6, borderColor: LINE, height: 12, marginTop: 4 },
  signCaption: { fontSize: 6.8, color: SOFT, textAlign: "center", marginTop: 1.5 },

})
