"use client"

import * as React from "react"
import Link from "next/link"
import { IconChevronRight, IconTruck } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

// Автопарк прямо в сайдбаре: раскрывается в список машин со статусными
// точками и счётчиком «свободно/всего». Диспетчер видит доступность парка,
// не уходя со страницы, на которой работает.

export type FleetVehicle = {
  id: number
  vehicle_code: string | null
  plate: string | null
  status: string | null
}

/** Зелёная — свободна, янтарная — в рейсе, серая — на ТО. */
function statusDot(status: string | null) {
  if (status === "Свободна") return "bg-emerald-500"
  if (status === "В рейсе") return "bg-amber-500"
  return "bg-slate-500"
}

export function NavFleet({ vehicles }: { vehicles: FleetVehicle[] }) {
  const [open, setOpen] = React.useState(true)

  const free = vehicles.filter((v) => v.status === "Свободна").length

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setOpen((v) => !v)}
          className="cursor-pointer"
          tooltip="Автопарк"
        >
          <IconTruck />
          <span>Автопарк</span>

          {vehicles.length > 0 && (
            <span className="ml-auto flex items-center gap-1.5">
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
                {free}/{vehicles.length}
              </span>
              <IconChevronRight
                className={cn("size-3.5 transition-transform", open && "rotate-90")}
              />
            </span>
          )}
        </SidebarMenuButton>

        {open && vehicles.length > 0 && (
          <SidebarMenuSub>
            {vehicles.slice(0, 8).map((v) => (
              <SidebarMenuSubItem key={v.id}>
                <SidebarMenuSubButton asChild>
                  <Link href="/dashboard/fleet" className="gap-2">
                    <span className={cn("size-1.5 shrink-0 rounded-full", statusDot(v.status))} />
                    <span className="truncate">{v.vehicle_code ?? v.plate ?? "Машина"}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}

            {vehicles.length > 8 && (
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <Link href="/dashboard/fleet" className="text-muted-foreground">
                    ещё {vehicles.length - 8}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
