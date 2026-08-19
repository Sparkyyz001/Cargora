# Обучение модели прогноза спроса на перевозки по направлениям области.
#
# Модель: GradientBoostingRegressor (scikit-learn). Одна модель на все
# 10 направлений — направление кодируется one-hot, что позволяет модели
# выучить общие погодные и календарные закономерности и при этом различать
# профили направлений.
#
# Валидация: временной сплит (без утечки) — последние 3 месяца как тест.
# Бейзлайн: среднее число заявок по (направление, день недели, час) на трейне —
# классический "hour-of-week climatology", который модель обязана обыграть.
#
# Экспорт: деревья выгружаются в lib/forecast-model.json, инференс выполняется
# на TypeScript внутри Next.js (см. lib/forecast.ts) — отдельный Python-сервер
# в проде не нужен.

from __future__ import annotations

import json
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

ROOT = Path(__file__).parent
DIRECTION_IDS = [
    "aktau-zhanaozen", "zhanaozen-aktau",
    "aktau-shetpe", "shetpe-aktau",
    "aktau-kuryk", "kuryk-aktau",
    "aktau-fort-shevchenko", "aktau-beineu",
    "aktau-zhetybai", "zhanaozen-zhetybai",
]
TEST_SPLIT = "2026-03-01"

DIRECTION_TITLES = {
    "aktau-zhanaozen": "Актау → Жанаозен",
    "zhanaozen-aktau": "Жанаозен → Актау",
    "aktau-shetpe": "Актау → Шетпе",
    "shetpe-aktau": "Шетпе → Актау",
    "aktau-kuryk": "Актау → Курык",
    "kuryk-aktau": "Курык → Актау",
    "aktau-fort-shevchenko": "Актау → Форт-Шевченко",
    "aktau-beineu": "Актау → Бейнеу",
    "aktau-zhetybai": "Актау → Жетыбай",
    "zhanaozen-zhetybai": "Жанаозен → Жетыбай",
}

FEATURES = [
    "hour_sin", "hour_cos", "dow", "is_weekend",
    "doy_sin", "doy_cos", "wind_ms", "temp_c", "is_holiday",
    *[f"dir_{d}" for d in DIRECTION_IDS],
]


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    ts = pd.to_datetime(df["timestamp"])
    out = pd.DataFrame(index=df.index)
    out["hour_sin"] = np.sin(2 * np.pi * ts.dt.hour / 24)
    out["hour_cos"] = np.cos(2 * np.pi * ts.dt.hour / 24)
    out["dow"] = ts.dt.dayofweek
    out["is_weekend"] = (ts.dt.dayofweek >= 5).astype(int)
    out["doy_sin"] = np.sin(2 * np.pi * ts.dt.dayofyear / 365.25)
    out["doy_cos"] = np.cos(2 * np.pi * ts.dt.dayofyear / 365.25)
    out["wind_ms"] = df["wind_ms"]
    out["temp_c"] = df["temp_c"]
    out["is_holiday"] = df["is_holiday"]
    for d in DIRECTION_IDS:
        out[f"dir_{d}"] = (df["direction"] == d).astype(int)
    return out[FEATURES]


def export_model(model: GradientBoostingRegressor, metrics: dict) -> None:
    trees = []
    for est in model.estimators_[:, 0]:
        t = est.tree_
        trees.append(
            {
                "f": t.feature.tolist(),
                "t": [round(x, 6) for x in t.threshold.tolist()],
                "l": t.children_left.tolist(),
                "r": t.children_right.tolist(),
                "v": [round(float(v[0][0]), 6) for v in t.value],
            }
        )
    payload = {
        "features": FEATURES,
        "init": round(float(model.init_.constant_[0][0]), 6),
        "learning_rate": model.learning_rate,
        "trees": trees,
        "metrics": metrics,
    }
    out = ROOT.parent / "lib" / "forecast-model.json"
    out.write_text(json.dumps(payload), encoding="utf-8")
    print(f"Модель экспортирована: {out} ({out.stat().st_size // 1024} КБ, {len(trees)} деревьев)")


def plot_test_window(df_test: pd.DataFrame, pred: np.ndarray) -> None:
    """Факт vs прогноз за последние 14 дней теста — главный график для презентации."""
    df = df_test.copy()
    df["pred"] = pred
    df["ts"] = pd.to_datetime(df["timestamp"])
    cutoff = df["ts"].max() - pd.Timedelta(days=14)
    df = df[df["ts"] >= cutoff]

    shown = ["aktau-zhanaozen", "aktau-shetpe", "aktau-beineu", "aktau-zhetybai"]
    fig, axes = plt.subplots(4, 1, figsize=(12, 10), sharex=True)
    for ax, name in zip(axes, shown):
        d = df[df["direction"] == name]
        ax.plot(d["ts"], d["orders_per_hour"], lw=0.9, color="#94a3b8", label="Факт")
        ax.plot(d["ts"], d["pred"], lw=1.4, color="#0ea5e9", label="Прогноз модели")
        ax.set_title(DIRECTION_TITLES[name], fontsize=10, loc="left")
        ax.set_ylabel("Заявок в час")
        ax.grid(alpha=0.25)
    axes[0].legend(loc="upper right", fontsize=9)
    fig.suptitle("Прогноз спроса на перевозки по направлениям — тестовое окно (14 дней)", y=0.995)
    fig.tight_layout()
    fig.savefig(ROOT / "figures" / "forecast_vs_actual.png", dpi=150)


def plot_importance(model: GradientBoostingRegressor) -> None:
    labels = {
        "hour_sin": "час (sin)", "hour_cos": "час (cos)", "dow": "день недели",
        "is_weekend": "выходной", "doy_sin": "сезон (sin)", "doy_cos": "сезон (cos)",
        "wind_ms": "ветер, м/с", "temp_c": "температура, °C", "is_holiday": "праздник РК",
        **{f"dir_{d}": f"направление: {DIRECTION_TITLES[d]}" for d in DIRECTION_IDS},
    }
    imp = pd.Series(model.feature_importances_, index=FEATURES).sort_values()
    fig, ax = plt.subplots(figsize=(9, 7))
    ax.barh([labels[f] for f in imp.index], imp.values, color="#0ea5e9")
    ax.set_title("Важность признаков (GradientBoosting)")
    ax.grid(axis="x", alpha=0.25)
    fig.tight_layout()
    fig.savefig(ROOT / "figures" / "feature_importance.png", dpi=150)


def main() -> None:
    df = pd.read_csv(ROOT / "data" / "direction_demand.csv")
    X = build_features(df)
    y = df["orders_per_hour"]

    is_test = pd.to_datetime(df["timestamp"]) >= TEST_SPLIT
    X_train, X_test = X[~is_test], X[is_test]
    y_train, y_test = y[~is_test], y[is_test]
    print(f"Трейн: {len(X_train):,}  Тест: {len(X_test):,}")

    # Бейзлайн: климатология по (пункт, день недели, час)
    train_meta = df[~is_test].copy()
    train_meta["hour"] = pd.to_datetime(train_meta["timestamp"]).dt.hour
    train_meta["dow"] = pd.to_datetime(train_meta["timestamp"]).dt.dayofweek
    clim = train_meta.groupby(["direction", "dow", "hour"])["orders_per_hour"].mean()

    test_meta = df[is_test].copy()
    test_meta["hour"] = pd.to_datetime(test_meta["timestamp"]).dt.hour
    test_meta["dow"] = pd.to_datetime(test_meta["timestamp"]).dt.dayofweek
    baseline_pred = test_meta.set_index(["direction", "dow", "hour"]).index.map(clim)

    model = GradientBoostingRegressor(
        n_estimators=220,
        max_depth=3,
        learning_rate=0.08,
        subsample=0.9,
        random_state=42,
    )
    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    metrics = {
        "test_period": f"{TEST_SPLIT} … {df['timestamp'].max()[:10]}",
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "model": {
            "mae": round(mean_absolute_error(y_test, pred), 2),
            "rmse": round(math.sqrt(mean_squared_error(y_test, pred)), 2),
            "r2": round(r2_score(y_test, pred), 3),
        },
        "baseline_hour_of_week": {
            "mae": round(mean_absolute_error(y_test, baseline_pred), 2),
            "rmse": round(math.sqrt(mean_squared_error(y_test, baseline_pred)), 2),
            "r2": round(r2_score(y_test, baseline_pred), 3),
        },
    }
    print(json.dumps(metrics, indent=2, ensure_ascii=False))
    (ROOT / "metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")

    (ROOT / "figures").mkdir(exist_ok=True)
    plot_test_window(df[is_test], pred)
    plot_importance(model)
    print("Графики сохранены в ml/figures/")

    export_model(model, metrics["model"])


if __name__ == "__main__":
    main()
