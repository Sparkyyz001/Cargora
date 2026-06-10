"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconAnchor,
  IconChartBar,
  IconDashboard,
  IconHelp,
  IconMap2,
  IconMapPin,
  IconPackage,
  IconSettings,
  IconTruck,
  IconTruckDelivery,
  IconUsers,
} from "@tabler/icons-react"

import { useLang } from "@/lib/use-lang"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type UserData = {
  name: string
  email: string
  avatar: string
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user?: UserData }) {
  const { t } = useLang()

  const userData = user ?? { name: "Пользователь", email: "", avatar: "" }

  const navMain = [
    { title: t.nav.overview, url: "/dashboard", icon: IconDashboard },
    { title: t.nav.orders, url: "/dashboard/orders", icon: IconPackage },
    { title: t.nav.routes, url: "/dashboard/routes", icon: IconMapPin },
    { title: t.nav.fleet, url: "/dashboard/fleet", icon: IconTruck },
    { title: t.nav.analytics, url: "/dashboard/analytics", icon: IconChartBar },
    { title: t.nav.customers, url: "/dashboard/customers", icon: IconUsers },
    { title: t.nav.map, url: "/dashboard/map", icon: IconMap2 },
    { title: t.nav.dispatch, url: "/dashboard/dispatch", icon: IconAnchor },
  ]

  const navSecondary = [
    { title: t.nav.settings, url: "/dashboard/settings", icon: IconSettings },
    { title: t.nav.help, url: "/dashboard/help", icon: IconHelp },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/dashboard">
                <IconTruckDelivery className="size-5!" />
                <span className="text-base font-semibold">Cargora</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} newOrderLabel={t.nav.newOrder} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
