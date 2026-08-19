# Сверка инференса: предсказания sklearn-модели должны совпадать с
# TypeScript-реализацией (lib/forecast.ts) на одинаковых входах.
# Запуск: .venv/Scripts/python parity_check.py  (после train.py)

import json
from pathlib import Path

import pandas as pd

from train import build_features

ROOT = Path(__file__).parent

CASES = [
    # (timestamp по Актау, направление, ветер м/с, температура °C)
    ("2026-06-12T09:00:00", "aktau-zhanaozen", 7.0, 24.0),       # утренний пик
    ("2026-06-12T03:00:00", "zhanaozen-aktau", 12.5, 18.0),      # ночь
    ("2026-12-16T10:00:00", "aktau-shetpe", 6.0, -14.0),         # праздник РК
    ("2026-01-25T15:00:00", "aktau-beineu", 19.0, -2.0),         # пыльная буря
    ("2026-06-14T11:00:00", "aktau-zhetybai", 5.0, 42.0),        # воскресенье + жара
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
        [{"timestamp": ts, "direction": d, "wind_ms": w, "temp_c": t, "is_holiday": 0} for ts, d, w, t in CASES]
    )
    ts = pd.to_datetime(df["timestamp"])
    holidays = {(1, 1), (1, 2), (3, 8), (3, 21), (3, 22), (3, 23), (5, 1), (5, 7), (5, 9), (7, 6), (8, 30), (10, 25), (12, 16)}
    df["is_holiday"] = [int((d.month, d.day) in holidays) for d in ts]
    X = build_features(df)

    for (case, x) in zip(CASES, X.values.tolist()):
        print(f"{case[0]} {case[1]:>22}: {predict_json(x):.4f}")


if __name__ == "__main__":
    main()
