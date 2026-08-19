# Генератор датасета транзитного потока через пункты пропуска Каспийского региона.
#
# Источников открытых почасовых данных по загруженности КПП Мангystau-региона
# не существует, поэтому датасет строится симулятором (что допускается треком:
# "Synthetic datasets generated from simulation tools"). Симулятор воспроизводит
# реальные процессы, известные из отчётов КГД и практики перевозчиков:
#   - суточный профиль работы пункта (ночь тихая, пики утром и после обеда);
#   - недельная сезонность (грузопоток проседает в выходные);
#   - годовая сезонность (пик осенью — зерно и стройматериалы);
#   - погода: штормовой ветер на Каспии останавливает погрузку в порту Актау,
#     сильный мороз замедляет досмотр на сухопутных КПП;
#   - праздничные дни РК: таможня работает в сокращённом составе, очередь растёт;
#   - случайные инциденты (поломки, усиленный досмотр) — латентный фактор,
#     модель его не видит, это честный источник неустранимого шума.
#
# Выход: data/checkpoint_traffic.csv (~70 тыс. наблюдений, 2 года, 4 пункта).

from __future__ import annotations

import math
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)

START = datetime(2024, 6, 1)
END = datetime(2026, 6, 11)

# Базовые параметры пунктов — согласованы с lib/checkpoint-load.ts
CHECKPOINTS = [
    {"id": "aktau-port", "kind": "sea", "base_load": 82},
    {"id": "bolashak", "kind": "road", "base_load": 88},
    {"id": "tazhen", "kind": "road", "base_load": 64},
    {"id": "beineu", "kind": "rail", "base_load": 71},
]

# Праздничные дни РК (месяц, день)
KZ_HOLIDAYS = {
    (1, 1), (1, 2), (3, 8), (3, 21), (3, 22), (3, 23),
    (5, 1), (5, 7), (5, 9), (7, 6), (8, 30), (10, 25), (12, 16),
}


def hour_factor(kind: str, hour: int) -> float:
    """Суточный профиль. Порт работает круглосуточно (профиль сглажен),
    автомобильные КПП имеют выраженные пики, ж/д — промежуточный вариант."""
    if 8 <= hour <= 11:
        road = 1.0
    elif 14 <= hour <= 18:
        road = 0.9
    elif 6 <= hour < 8:
        road = 0.7
    elif 12 <= hour < 14:
        road = 0.75
    elif 19 <= hour <= 22:
        road = 0.55
    else:
        road = 0.35
    if kind == "road":
        return road
    if kind == "sea":
        return 0.6 + 0.4 * road  # ночью порт продолжает работать
    return 0.5 + 0.5 * road  # rail


def dow_factor(kind: str, dow: int) -> float:
    """Недельная сезонность: Пн=0 ... Вс=6."""
    road = [0.95, 1.0, 1.0, 1.0, 1.05, 0.85, 0.7][dow]
    if kind == "road":
        return road
    if kind == "sea":
        return 0.85 + 0.15 * road  # паромные графики сглаживают неделю
    return [1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.85][dow]  # rail


def season_factor(doy: int) -> float:
    """Годовая сезонность: пик в начале октября (зерно, стройматериалы),
    спад в январе-феврале."""
    return 1.0 + 0.10 * math.cos(2 * math.pi * (doy - 280) / 365.25)


def simulate_weather(n_hours: int) -> tuple[np.ndarray, np.ndarray]:
    """AR(1)-ветер (м/с) и температура (°C) для района Актау."""
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


def weather_effect(kind: str, wind: float, temp: float) -> float:
    """Погодная надбавка к загрузке: шторм копит очередь в порту,
    мороз замедляет досмотр на сухопутных КПП."""
    eff = 0.0
    if kind == "sea":
        eff += min(30.0, max(0.0, wind - 13.0) * 3.5)
    elif kind == "road":
        eff += min(15.0, max(0.0, -12.0 - temp) * 1.2)
        eff += min(8.0, max(0.0, wind - 18.0) * 1.5)  # пыльные бури
    else:  # rail устойчивее к погоде
        eff += min(6.0, max(0.0, -20.0 - temp) * 0.8)
    return eff


def generate_incidents(n_hours: int) -> np.ndarray:
    """Случайные инциденты: усиленный досмотр, поломка терминала.
    Латентный фактор — в датасет не пишется."""
    add = np.zeros(n_hours)
    t = 0
    while t < n_hours:
        gap = int(RNG.exponential(20 * 24))  # в среднем раз в 20 дней
        dur = int(RNG.uniform(6, 30))
        mag = RNG.uniform(15, 30)
        start = t + gap
        add[start : start + dur] += mag
        t = start + dur
    return add


def main() -> None:
    n_hours = int((END - START).total_seconds() // 3600)
    wind, temp = simulate_weather(n_hours)

    rows = []
    for cp in CHECKPOINTS:
        incidents = generate_incidents(n_hours)
        for i in range(n_hours):
            ts = START + timedelta(hours=i)
            doy = ts.timetuple().tm_yday
            dow = ts.weekday()
            is_holiday = int((ts.month, ts.day) in KZ_HOLIDAYS)

            load = (
                cp["base_load"]
                * hour_factor(cp["kind"], ts.hour)
                * dow_factor(cp["kind"], dow)
                * season_factor(doy)
            )
            load += weather_effect(cp["kind"], wind[i], temp[i])
            load += 10.0 * is_holiday  # сокращённый состав таможни -> очередь растёт
            load += incidents[i]
            load += RNG.normal(0, 4.0)

            rows.append(
                {
                    "timestamp": ts.isoformat(),
                    "checkpoint": cp["id"],
                    "load_pct": round(float(np.clip(load, 8, 100)), 1),
                    "wind_ms": round(float(wind[i]), 1),
                    "temp_c": round(float(temp[i]), 1),
                    "is_holiday": is_holiday,
                }
            )

    df = pd.DataFrame(rows)
    out = Path(__file__).parent / "data" / "checkpoint_traffic.csv"
    out.parent.mkdir(exist_ok=True)
    df.to_csv(out, index=False)
    print(f"OK: {len(df):,} строк -> {out}")
    print(df.groupby("checkpoint")["load_pct"].describe().round(1))


if __name__ == "__main__":
    main()
