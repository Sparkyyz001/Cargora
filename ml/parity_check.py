# Сверка инференса: предсказания sklearn-модели должны совпадать с
# TypeScript-реализацией (lib/forecast.ts) на одинаковых входах.
# Запуск: .venv/Scripts/python parity_check.py  (после train.py)

import json
from pathlib import Path

import pandas as pd

from train import build_features

ROOT = Path(__file__).parent

CASES = [
    # (timestamp по Актау, пункт, ветер м/с, температура °C)
    ("2026-06-12T09:00:00", "aktau-port", 7.0, 24.0),
    ("2026-06-12T03:00:00", "bolashak", 12.5, 18.0),
    ("2026-12-16T10:00:00", "tazhen", 6.0, -14.0),   # праздник + мороз
    ("2026-01-25T15:00:00", "aktau-port", 19.0, -2.0),  # шторм в порту
    ("2026-06-14T11:00:00", "beineu", 5.0, 28.0),    # воскресенье
]


def main() -> None:
    payload = json.loads((ROOT.parent / "lib" / "forecast-model.json").read_text(encoding="utf-8"))

    def predict_json(x: list[float]) -> float:
        total = payload["init"]
        for tr in payload["trees"]:
            node = 0
            while tr["l"][node] != -1:
                node = tr["l"][node] if x[tr["f"][node]] <= tr["t"][node] else tr["r"][node]
            total += payload["learning_rate"] * tr["v"][node]
        return total

    df = pd.DataFrame(
        [{"timestamp": ts, "checkpoint": cp, "wind_ms": w, "temp_c": t, "is_holiday": 0} for ts, cp, w, t in CASES]
    )
    ts = pd.to_datetime(df["timestamp"])
    holidays = {(1, 1), (1, 2), (3, 8), (3, 21), (3, 22), (3, 23), (5, 1), (5, 7), (5, 9), (7, 6), (8, 30), (10, 25), (12, 16)}
    df["is_holiday"] = [int((d.month, d.day) in holidays) for d in ts]
    X = build_features(df)

    for (case, x) in zip(CASES, X.values.tolist()):
        print(f"{case[0]} {case[1]:>11}: {predict_json(x):.4f}")


if __name__ == "__main__":
    main()
