# Генератор датасета спроса на перевозки по направлениям внутри
# Мангистауской области.
#
# Открытых почасовых данных о числе заявок на перевозку внутри области
# не существует — БНС такую статистику не публикует. Поэтому датасет строится
# симулятором (что допускается треком: "Synthetic datasets generated from
# simulation tools"). Симулятор воспроизводит процессы, известные из практики
# регионального развоза:
#   - суточный профиль: утренний развоз в магазины 06:00–10:00 и вторая
#     волна после обеда 14:00–17:00, ночью заявок почти нет;
#   - недельная сезонность: пик в понедельник и пятницу (завоз в торговлю),
#     провал в воскресенье;
#   - годовая сезонность: строительный сезон апрель–октябрь тянет вверх
#     стройматериалы и инертные грузы, зимой спад;
#   - погода: пыльная буря (ветер >15 м/с) сажает активность на 30–50%,
#     жара выше 40 °C бьёт по перевозке скоропорта;
#   - праздничные дни РК: торговля не завозит, спрос падает;
#   - размер населённого пункта: базовый спрос пропорционален населению
#     точки назначения;
#   - случайные инциденты (перекрытия дороги, аварии на трассе) — латентный
#     фактор, модель его не видит, это честный источник неустранимого шума.
#
# Выход: data/direction_demand.csv (~70 тыс. наблюдений, 2 года, 10 направлений).

from __future__ import annotations

import math
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)

START = datetime(2024, 6, 1)
END = datetime(2026, 6, 11)

# Десять ключевых внутрирегиональных направлений.
# dest_pop — население точки назначения (OSM/БНС), задаёт базовый спрос.
# build_share — доля стройматериалов и инертных грузов на направлении:
# на них сильнее всего действует строительный сезон.
DIRECTIONS = [
    {"id": "aktau-zhanaozen",     "dest_pop": 150000, "build_share": 0.35},
    {"id": "zhanaozen-aktau",     "dest_pop": 303752, "build_share": 0.20},
    {"id": "aktau-shetpe",        "dest_pop":  17100, "build_share": 0.40},
    {"id": "shetpe-aktau",        "dest_pop": 303752, "build_share": 0.55},
    {"id": "aktau-kuryk",         "dest_pop":  11600, "build_share": 0.30},
    {"id": "kuryk-aktau",         "dest_pop": 303752, "build_share": 0.20},
    {"id": "aktau-fort-shevchenko", "dest_pop": 8780, "build_share": 0.30},
    {"id": "aktau-beineu",        "dest_pop":  58000, "build_share": 0.45},
    {"id": "aktau-zhetybai",      "dest_pop":  13500, "build_share": 0.35},
    {"id": "zhanaozen-zhetybai",  "dest_pop":  13500, "build_share": 0.40},
]

# Праздничные дни РК (месяц, день)
KZ_HOLIDAYS = {
    (1, 1), (1, 2), (3, 8), (3, 21), (3, 22), (3, 23),
    (5, 1), (5, 7), (5, 9), (7, 6), (8, 30), (10, 25), (12, 16),
}


def hour_factor(hour: int) -> float:
    """Суточный профиль развоза: утренняя волна в магазины, вторая после
    обеда, ночью заявки почти не размещают."""
    if 6 <= hour <= 10:
        return 1.0
    if 14 <= hour <= 17:
        return 0.85
    if 11 <= hour < 14:
        return 0.7
    if 18 <= hour <= 20:
        return 0.4
    if 21 <= hour <= 22:
        return 0.18
    return 0.06


def dow_factor(dow: int) -> float:
    """Недельная сезонность: Пн=0 ... Вс=6.
    Понедельник и пятница — завоз в торговлю, воскресенье почти пустое."""
    return [1.15, 0.95, 0.92, 0.98, 1.12, 0.75, 0.45][dow]


def season_factor(doy: int, build_share: float) -> float:
    """Годовая сезонность. Строительный сезон апрель–октябрь поднимает
    направления с высокой долей стройматериалов; общий фон зимой ниже."""
    # Пик приходится на середину июля (doy ≈ 196)
    build = 1.0 + 0.55 * math.cos(2 * math.pi * (doy - 196) / 365.25)
    general = 1.0 + 0.08 * math.cos(2 * math.pi * (doy - 196) / 365.25)
    return build_share * build + (1.0 - build_share) * general


def size_factor(dest_pop: int) -> float:
    """Базовый уровень спроса пропорционален населению точки назначения,
    но сублинейно: посёлок на 10 тысяч не заказывает в 30 раз меньше
    городa на 300 тысяч — там просто меньше магазинов, а не пропорционально."""
    return 0.35 + 1.65 * math.sqrt(dest_pop / 303752)


def simulate_weather(n_hours: int) -> tuple[np.ndarray, np.ndarray]:
    """AR(1)-ветер (м/с) и температура (°C) для района Актау.
    Модель ветра переиспользована из прежнего симулятора: климат тот же."""
    wind = np.empty(n_hours)
    w = 7.0
    for i in range(n_hours):
        # зимой ветер в среднем сильнее
        doy = ((START + timedelta(hours=i)).timetuple().tm_yday)
        season_mean = 7.0 + 2.5 * math.cos(2 * math.pi * (doy - 20) / 365.25)
        w = 0.92 * w + 0.08 * season_mean + RNG.normal(0, 1.1)
        wind[i] = max(0.0, w)

    hours = np.arange(n_hours)
    doys = np.array([(START + timedelta(hours=int(h))).timetuple().tm_yday for h in hours])
    hod = np.array([(START + timedelta(hours=int(h))).hour for h in hours])
    temp = (
        13.0
        + 16.0 * np.cos(2 * np.pi * (doys - 200) / 365.25)
        + 5.0 * np.cos(2 * np.pi * (hod - 15) / 24)
        + RNG.normal(0, 2.0, n_hours)
    )
    return wind, temp


def weather_factor(wind: float, temp: float) -> float:
    """Погодный множитель спроса. Пыльная буря останавливает развоз,
    экстремальная жара бьёт по скоропорту."""
    factor = 1.0
    if wind > 15.0:
        # 15 м/с — активность −30%, 22 м/с и выше — −50%
        factor *= max(0.5, 1.0 - 0.30 - 0.03 * (wind - 15.0))
    if temp > 40.0:
        factor *= max(0.75, 1.0 - 0.04 * (temp - 40.0))
    return factor


def generate_incidents(n_hours: int) -> np.ndarray:
    """Случайные инциденты: перекрытие трассы, авария, занос песком.
    Латентный фактор — в датасет не пишется, модель его не видит."""
    mult = np.ones(n_hours)
    t = 0
    while t < n_hours:
        gap = int(RNG.exponential(20 * 24))  # в среднем раз в 20 дней
        dur = int(RNG.uniform(6, 30))
        drop = RNG.uniform(0.35, 0.7)
        start = t + gap
        mult[start : start + dur] *= drop
        t = start + dur
    return mult


def main() -> None:
    n_hours = int((END - START).total_seconds() // 3600)
    wind, temp = simulate_weather(n_hours)

    rows = []
    for d in DIRECTIONS:
        incidents = generate_incidents(n_hours)
        base = 2.6 * size_factor(d["dest_pop"])

        for i in range(n_hours):
            ts = START + timedelta(hours=i)
            doy = ts.timetuple().tm_yday
            dow = ts.weekday()
            is_holiday = int((ts.month, ts.day) in KZ_HOLIDAYS)

            demand = (
                base
                * hour_factor(ts.hour)
                * dow_factor(dow)
                * season_factor(doy, d["build_share"])
                * weather_factor(wind[i], temp[i])
                * incidents[i]
            )
            if is_holiday:
                demand *= 0.45  # торговля не завозит
            demand += RNG.normal(0, 0.35)

            rows.append(
                {
                    "timestamp": ts.isoformat(),
                    "direction": d["id"],
                    "orders_per_hour": round(float(np.clip(demand, 0.0, 20.0)), 2),
                    "wind_ms": round(float(wind[i]), 1),
                    "temp_c": round(float(temp[i]), 1),
                    "is_holiday": is_holiday,
                }
            )

    df = pd.DataFrame(rows)
    out = Path(__file__).parent / "data" / "direction_demand.csv"
    out.parent.mkdir(exist_ok=True)
    df.to_csv(out, index=False)
    print(f"OK: {len(df):,} строк -> {out}")
    print(df.groupby("direction")["orders_per_hour"].describe().round(2))


if __name__ == "__main__":
    main()
