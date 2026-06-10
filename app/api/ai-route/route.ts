import { NextRequest, NextResponse } from "next/server"

const FERRIES = [
  {
    id: "KF-2891",
    vessel: "Казахстан",
    route: "Актау → Туркменбаши",
    destKeys: ["туркменбаши", "туркменистан", "turkmenbashi", "turkmenistan"],
    departure: "14:30",
    availTeu: 127,
    pricePerTeu: 1100,
    transitDays: 1,
  },
  {
    id: "AZ-3301",
    vessel: "Дагестан",
    route: "Актау → Туркменбаши",
    destKeys: ["туркменбаши", "туркменистан", "turkmenbashi", "turkmenistan"],
    departure: "20:15",
    availTeu: 242,
    pricePerTeu: 950,
    transitDays: 1,
  },
  {
    id: "KZ-1047",
    vessel: "Азербайджан",
    route: "Актау → Баку (Алят)",
    destKeys: ["баку", "алят", "азербайджан", "baku", "alat", "azerbaijan"],
    departure: "09:00",
    availTeu: 83,
    pricePerTeu: 1400,
    transitDays: 2,
  },
  {
    id: "KF-3104",
    vessel: "Рустам Назаров",
    route: "Актау → Баку (Алят)",
    destKeys: ["баку", "алят", "азербайджан", "baku", "alat"],
    departure: "23:00",
    availTeu: 155,
    pricePerTeu: 1350,
    transitDays: 2,
  },
  {
    id: "IZ-0892",
    vessel: "Иранский экспресс",
    route: "Актау → Амирабад",
    destKeys: ["амирабад", "иран", "iran", "amirabad", "нефтчала", "энзели"],
    departure: "16:45",
    availTeu: 61,
    pricePerTeu: 1600,
    transitDays: 3,
  },
]

const LAND_CARRIERS = [
  {
    id: "TRK-2891",
    vessel: "КазТрансАвто · КамАЗ 20т",
    route: "Актау → Алматы",
    destKeys: ["алматы", "almaty", "алма-ата", "алмата"],
    departure: "08:00",
    availTeu: 12,
    pricePerTeu: 2200,
    transitDays: 3,
  },
  {
    id: "TRK-3401",
    vessel: "МанТранс · МАЗ 20т",
    route: "Актау → Астана",
    destKeys: ["астана", "нур-султан", "astana", "nursultan"],
    departure: "06:00",
    availTeu: 8,
    pricePerTeu: 2700,
    transitDays: 4,
  },
  {
    id: "TRK-1204",
    vessel: "КазЛогистик · Volvo FH",
    route: "Актау → Шымкент",
    destKeys: ["шымкент", "чимкент", "shymkent", "shimkent"],
    departure: "10:00",
    availTeu: 15,
    pricePerTeu: 1800,
    transitDays: 2,
  },
  {
    id: "TRK-0711",
    vessel: "АтырауТранс · КамАЗ 20т",
    route: "Актау → Атырау",
    destKeys: ["атырау", "atyrau", "гурьев"],
    departure: "12:00",
    availTeu: 20,
    pricePerTeu: 600,
    transitDays: 1,
  },
  {
    id: "TRK-4502",
    vessel: "КазТМ · Scania R450",
    route: "Актау → Ташкент",
    destKeys: ["ташкент", "tashkent", "узбекистан"],
    departure: "07:30",
    availTeu: 6,
    pricePerTeu: 2500,
    transitDays: 3,
  },
  {
    id: "TRK-3011",
    vessel: "МангТранс · МАН TGX",
    route: "Актау → Актобе",
    destKeys: ["актобе", "aktobe", "актюбинск"],
    departure: "09:00",
    availTeu: 10,
    pricePerTeu: 1200,
    transitDays: 2,
  },
]

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { cargo_type, weight, volume, recipient_address, delivery_date, transport_type } = body

  const dest = ((recipient_address as string) || "").toLowerCase()
  const isLand = transport_type === "land"
  const pool = isLand ? LAND_CARRIERS : FERRIES

  let matching = pool.filter((c) => c.destKeys.some((k) => dest.includes(k)))
  if (matching.length === 0) matching = pool

  const kg = Number(weight) || 18000
  // For land: trucks needed = ceil(kg / 20000); for ferry: TEU needed (same formula)
  const teuNeeded = Math.max(1, Math.ceil(kg / 20000))

  const available = matching.filter((c) => c.availTeu >= teuNeeded)
  const candidates = available.length > 0 ? available : matching

  const groqKey = process.env.GROQ_API_KEY

  if (!groqKey) {
    const best = [...candidates].sort((a, b) => a.pricePerTeu - b.pricePerTeu)[0]
    const totalUsd = teuNeeded * best.pricePerTeu
    const commission = Math.round(totalUsd * 0.02)
    const unit = isLand ? "грузовик" : "TEU"
    const unitNeeded = isLand ? "грузовиков" : "TEU"
    return NextResponse.json({
      ok: true,
      transport_type: isLand ? "land" : "ferry",
      ferry: best,
      teuNeeded,
      totalUsd,
      commission,
      reasoning: isLand
        ? `Рекомендую перевозчика ${best.id} — ${best.vessel}. Маршрут: ${best.route}, отправление ${best.departure}. Нужно ${teuNeeded} ${unitNeeded} для ${kg.toLocaleString()} кг груза. Срок доставки: ${best.transitDays} дн. Итого: $${totalUsd.toLocaleString()}. Комиссия Cargora 2% = $${commission}.`
        : `Рекомендую рейс ${best.id} — судно «${best.vessel}». ${best.route}, отправление ${best.departure}. Свободно ${best.availTeu} TEU, требуется ${teuNeeded} TEU для ${kg.toLocaleString()} кг груза. Итого: $${totalUsd.toLocaleString()}. Комиссия Cargora 2% = $${commission}.`,
    })
  }

  try {
    const modeLabel = isLand ? "Сухопутные перевозчики из Актау" : "Паромные рейсы из порта Актау"
    const unitLabel = isLand ? "грузовиков" : "TEU"
    const priceLabel = isLand ? "$/грузовик" : "$/TEU"

    const carrierList = candidates
      .map(
        (c) =>
          `${c.id} (${c.vessel}): ${c.route}, отправление ${c.departure}, свободно ${c.availTeu} ${unitLabel}, ${c.pricePerTeu} ${priceLabel}, транзит ${c.transitDays} дн.`
      )
      .join("\n")

    const systemPrompt = isLand
      ? `Ты — AI-диспетчер сухопутной логистики, платформа Cargora. Отвечай ТОЛЬКО на русском, кратко и профессионально.\n\n${modeLabel}:\n${carrierList}\n\nВыбери ОДНОГО лучшего перевозчика. Учти: цену, наличие мест, тип груза, срок. Начни ответ с "Рекомендую перевозчика [ID]", затем 2-3 предложения обоснования и итоговая цена.`
      : `Ты — AI-диспетчер паромной логистики Каспийского моря, платформа Cargora. Отвечай ТОЛЬКО на русском, кратко и профессионально.\n\n${modeLabel}:\n${carrierList}\n\nВыбери ОДИН лучший рейс. Учти: цену, наличие мест, тип груза, срок доставки. Начни ответ с "Рекомендую рейс [ID]", затем 2-3 предложения обоснования и итоговая цена.`

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Груз: ${cargo_type || "не указан"}, вес ${kg.toLocaleString()} кг${volume ? `, объём ${volume} м³` : ""}, назначение: ${recipient_address || "Алматы"}, желаемая дата: ${delivery_date || "ближайшее время"}.`,
          },
        ],
        max_tokens: 280,
        temperature: 0.2,
      }),
    })

    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ""

    const rec = candidates.find((c) => text.includes(c.id)) ?? candidates[0]
    const totalUsd = teuNeeded * rec.pricePerTeu
    const commission = Math.round(totalUsd * 0.02)

    return NextResponse.json({
      ok: true,
      transport_type: isLand ? "land" : "ferry",
      ferry: rec,
      teuNeeded,
      totalUsd,
      commission,
      reasoning:
        text ||
        (isLand
          ? `Рекомендую ${rec.id} — ${rec.route}, отправление ${rec.departure}. Стоимость: $${totalUsd.toLocaleString()}.`
          : `Рекомендую рейс ${rec.id} — ${rec.route}, отправление ${rec.departure}. Стоимость: $${totalUsd.toLocaleString()}.`),
    })
  } catch {
    const best = candidates[0]
    const totalUsd = teuNeeded * best.pricePerTeu
    const commission = Math.round(totalUsd * 0.02)
    return NextResponse.json({
      ok: true,
      transport_type: isLand ? "land" : "ferry",
      ferry: best,
      teuNeeded,
      totalUsd,
      commission,
      reasoning: isLand
        ? `Рекомендую ${best.id} — ${best.vessel}. Маршрут ${best.route}, отправление ${best.departure}. Нужно ${teuNeeded} грузовик(ов). Стоимость: $${totalUsd.toLocaleString()}, комиссия Cargora = $${commission}.`
        : `Рекомендую рейс ${best.id} — судно «${best.vessel}». ${best.route}, отправление ${best.departure}. Нужно ${teuNeeded} TEU. Стоимость: $${totalUsd.toLocaleString()}, комиссия Cargora = $${commission}.`,
    })
  }
}
