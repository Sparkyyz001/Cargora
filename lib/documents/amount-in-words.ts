// Сумма прописью для печатных документов.
//
// В накладной и счёте сумма всегда дублируется словами — так подделать
// цифру после подписи нельзя. Пишем по правилам русской бухгалтерской
// формы: «Двести пятьдесят тысяч тенге 00 тиын».

const ONES_MASCULINE = [
  "", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять",
]
const ONES_FEMININE = [
  "", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять",
]
const TEENS = [
  "десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать",
  "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать",
]
const TENS = [
  "", "", "двадцать", "тридцать", "сорок", "пятьдесят",
  "шестьдесят", "семьдесят", "восемьдесят", "девяносто",
]
const HUNDREDS = [
  "", "сто", "двести", "триста", "четыреста", "пятьсот",
  "шестьсот", "семьсот", "восемьсот", "девятьсот",
]

/** Склонение по последней цифре: 1 тенге, 2 тенге, 5 тенге. */
function plural(n: number, forms: [string, string, string]): string {
  const mod100 = n % 100
  const mod10 = n % 10
  if (mod100 >= 11 && mod100 <= 19) return forms[2]
  if (mod10 === 1) return forms[0]
  if (mod10 >= 2 && mod10 <= 4) return forms[1]
  return forms[2]
}

function triad(n: number, feminine: boolean): string[] {
  const words: string[] = []
  const h = Math.floor(n / 100)
  const t = Math.floor((n % 100) / 10)
  const o = n % 10

  if (h > 0) words.push(HUNDREDS[h])
  if (t === 1) {
    words.push(TEENS[o])
  } else {
    if (t > 1) words.push(TENS[t])
    if (o > 0) words.push((feminine ? ONES_FEMININE : ONES_MASCULINE)[o])
  }
  return words
}

/** «Двести пятьдесят тысяч тенге 00 тиын» */
export function tengeInWords(amount: number): string {
  const value = Math.max(0, Math.round(Number(amount) * 100) / 100)
  const whole = Math.floor(value)
  const coins = Math.round((value - whole) * 100)

  if (whole === 0) return `Ноль тенге ${String(coins).padStart(2, "0")} тиын`

  const words: string[] = []
  const millions = Math.floor(whole / 1_000_000)
  const thousands = Math.floor((whole % 1_000_000) / 1000)
  const rest = whole % 1000

  if (millions > 0) {
    words.push(...triad(millions, false))
    words.push(plural(millions, ["миллион", "миллиона", "миллионов"]))
  }
  if (thousands > 0) {
    words.push(...triad(thousands, true))
    words.push(plural(thousands, ["тысяча", "тысячи", "тысяч"]))
  }
  if (rest > 0) words.push(...triad(rest, false))

  const phrase = words.filter(Boolean).join(" ")
  const capitalized = phrase.charAt(0).toUpperCase() + phrase.slice(1)
  return `${capitalized} ${plural(whole, ["тенге", "тенге", "тенге"])} ${String(coins).padStart(2, "0")} тиын`
}
