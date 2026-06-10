"use client"

import * as React from "react"
import {
  Calendar as AriaCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  Button as AriaButton,
  type CalendarProps,
  type DateValue,
} from "react-aria-components"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"

import { cn } from "@/lib/utils"

interface CalendarRacProps<T extends DateValue> extends CalendarProps<T> {
  className?: string
}

export function CalendarRac<T extends DateValue>({
  className,
  ...props
}: CalendarRacProps<T>) {
  return (
    <AriaCalendar {...props} className={cn("w-fit", className)}>
      <div className="flex items-center justify-between gap-2 pb-3">
        <AriaButton
          slot="previous"
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <IconChevronLeft className="size-4" />
        </AriaButton>
        <Heading className="text-sm font-medium" />
        <AriaButton
          slot="next"
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <IconChevronRight className="size-4" />
        </AriaButton>
      </div>
      <CalendarGrid className="w-full border-collapse">
        <CalendarGridHeader>
          {(day) => (
            <CalendarHeaderCell className="size-9 text-xs font-medium text-muted-foreground">
              {day}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className={({ isSelected, isDisabled, isOutsideMonth, isToday }) =>
                cn(
                  "flex size-9 cursor-default items-center justify-center rounded-md text-sm outline-none transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  isToday && !isSelected && "bg-accent/60 font-medium",
                  isSelected &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  isOutsideMonth && "text-muted-foreground/40",
                  isDisabled && "pointer-events-none opacity-30"
                )
              }
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </AriaCalendar>
  )
}
