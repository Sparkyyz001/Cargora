"use client"

import * as React from "react"
import { IconPlayerPause, IconPlayerPlay, IconRefresh } from "@tabler/icons-react"

import { cn } from "@/lib/utils"

// Плеер симуляции суток. На скорости 10x сутки области проходят
// за две с половиной минуты — ровно столько длится демо на питче,
// и движение машин видно из зала.

const SPEEDS = [1, 5, 10, 30] as const
export type SimSpeed = (typeof SPEEDS)[number]

/** Рабочий день развоза: первые машины выходят в 5 утра. */
export const SIM_START_HOUR = 5

export function useSimulation() {
  const [hour, setHour] = React.useState(SIM_START_HOUR)
  const [playing, setPlaying] = React.useState(false)
  const [speed, setSpeed] = React.useState<SimSpeed>(10)

  React.useEffect(() => {
    if (!playing) return

    // Один шаг в 200 мс — движение плавное, а не рывками
    const STEP_MS = 200

    const timer = setInterval(() => {
      setHour((h) => {
        // На 1x одна симулированная минута проходит за реальную секунду:
        // рабочий день области (19 часов) занимает 19 минут, на 10x — меньше
        // двух, на 30x — сорок секунд. Прежняя формула гнала в шесть раз
        // быстрее и на 1x сутки пролетали за три минуты.
        const simHoursPerStep = (speed * (STEP_MS / 1000)) / 60
        const next = h + simHoursPerStep
        if (next >= 24) {
          setPlaying(false)
          return 24
        }
        return next
      })
    }, STEP_MS)

    return () => clearInterval(timer)
  }, [playing, speed])

  const reset = React.useCallback(() => {
    setHour(SIM_START_HOUR)
    setPlaying(false)
  }, [])

  return { hour, setHour, playing, setPlaying, speed, setSpeed, reset }
}

/** «14:35» из 14.583 */
export function formatSimClock(hour: number): string {
  const h = Math.floor(hour) % 24
  const m = Math.floor((hour - Math.floor(hour)) * 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function SimControls({
  hour,
  playing,
  speed,
  onPlayPause,
  onReset,
  onSpeed,
  onScrub,
  stats,
}: {
  hour: number
  playing: boolean
  speed: SimSpeed
  onPlayPause: () => void
  onReset: () => void
  onSpeed: (s: SimSpeed) => void
  onScrub: (h: number) => void
  stats: { total: number; active: number; done: number }
}) {
  const progress = ((hour - SIM_START_HOUR) / (24 - SIM_START_HOUR)) * 100

  return (
    <div className="pointer-events-auto w-[420px] max-w-[calc(100vw-2rem)] rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
      {/* Часы и управление */}
      <div className="flex items-center gap-3">
        <button
          onClick={onPlayPause}
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90"
          aria-label={playing ? "Пауза" : "Запустить"}
        >
          {playing ? <IconPlayerPause className="size-4" /> : <IconPlayerPlay className="size-4" />}
        </button>

        <button
          onClick={onReset}
          className="grid size-9 shrink-0 place-items-center rounded-lg border transition-colors hover:bg-accent"
          aria-label="Сбросить"
        >
          <IconRefresh className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-semibold tabular-nums">
              {formatSimClock(hour)}
            </span>
            <span className="text-xs text-muted-foreground">сутки по области</span>
          </div>
        </div>

        <div className="flex shrink-0 gap-0.5 rounded-lg border p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeed(s)}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium tabular-nums transition-colors",
                speed === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Шкала суток — можно перетащить в нужный час */}
      <div className="mt-3">
        <input
          type="range"
          min={SIM_START_HOUR}
          max={24}
          step={0.05}
          value={hour}
          onChange={(e) => onScrub(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        />
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
          <span>05:00</span>
          <span>{progress.toFixed(0)}%</span>
          <span>24:00</span>
        </div>
      </div>

      {/* Счётчики рейсов */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/60 py-1.5">
          <div className="text-sm font-semibold tabular-nums">{stats.total}</div>
          <div className="text-[10px] text-muted-foreground">рейсов за сутки</div>
        </div>
        <div className="rounded-lg bg-amber-500/10 py-1.5">
          <div className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
            {stats.active}
          </div>
          <div className="text-[10px] text-muted-foreground">в пути сейчас</div>
        </div>
        <div className="rounded-lg bg-emerald-500/10 py-1.5">
          <div className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {stats.done}
          </div>
          <div className="text-[10px] text-muted-foreground">доставлено</div>
        </div>
      </div>
    </div>
  )
}
