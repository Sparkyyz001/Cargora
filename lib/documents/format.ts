// Форматирование дат и чисел для печатных документов.
// Часовой пояс жёстко актауский: документ печатается на месте, и дата в нём
// должна совпадать с датой на стене, а не с часовым поясом сервера.

const TZ = "Asia/Aqtau"

const MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
]

function parts(value: string | Date | null | undefined) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(d.getTime())) return null
  const fmt = new Intl.DateTimeFormat("ru-RU", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d)
  const get = (t: string) => fmt.find((p) => p.type === t)?.value ?? ""
  return {
    day: Number(get("day")),
    month: Number(get("month")),
    year: Number(get("year")),
    hour: get("hour"),
    minute: get("minute"),
  }
}

/** 20 августа 2026 г. */
export function longDate(value: string | Date | null | undefined): string {
  const p = parts(value)
  if (!p) return "—"
  return `${p.day} ${MONTHS_GENITIVE[p.month - 1]} ${p.year} г.`
}

/** «20» августа 2026 г. — так дата пишется в бланках. */
export function blankDate(value: string | Date | null | undefined): string {
  const p = parts(value)
  if (!p) return "«___» _______________ 20___ г."
  return `«${String(p.day).padStart(2, "0")}» ${MONTHS_GENITIVE[p.month - 1]} ${p.year} г.`
}

/** 20.08.2026 */
export function shortDate(value: string | Date | null | undefined): string {
  const p = parts(value)
  if (!p) return "—"
  return `${String(p.day).padStart(2, "0")}.${String(p.month).padStart(2, "0")}.${p.year}`
}

/** 14:35 */
export function time(value: string | Date | null | undefined): string {
  const p = parts(value)
  if (!p) return "—"
  return `${p.hour}:${p.minute}`
}

/** 20.08.2026 14:35 */
export function dateTime(value: string | Date | null | undefined): string {
  const p = parts(value)
  if (!p) return "—"
  return `${shortDate(value)} ${p.hour}:${p.minute}`
}

/** 1 234,5 — разряды неразрывными пробелами, как в печатных таблицах. */
export function num(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/** 3 ч 40 мин */
export function duration(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "—"
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h} ч ${String(m).padStart(2, "0")} мин`
}

/** Латинская транслитерация — для имени скачиваемого файла. */
export function translit(value: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  }
  return value
    .split("")
    .map((ch) => {
      const lower = ch.toLowerCase()
      const mapped = map[lower]
      if (mapped === undefined) return /[a-zA-Z0-9-]/.test(ch) ? ch : "_"
      return ch === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1)
    })
    .join("")
}

/** 2 140 000 тенге — в документах валюту пишут словом, а не знаком ₸:
 *  знак тенге есть не во всех гарнитурах и в печати читается хуже. */
export function kzt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${num(Math.round(value))} тенге`
}
