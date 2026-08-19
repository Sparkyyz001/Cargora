"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconBuildingBank,
  IconChartBar,
  IconDashboard,
  IconHelp,
  IconMap2,
  IconMapPin,
  IconPackage,
  IconSettings,
  IconTruckDelivery,
  IconUsers,
  type Icon,
} from "@tabler/icons-react"

import { useLang } from "@/lib/use-lang"
import { NavFleet, type FleetVehicle } from "@/components/nav-fleet"
import { NavUser } from "@/components/nav-user"
import { NewOrderDialog } from "@/components/new-order-dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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

type NavItem = { title: string; url: string; icon: Icon }

// Сайдбар собран по образцу диспетчерских консолей: сверху основное
// действие, ниже разделы сгруппированы по смыслу — операции, ресурсы,
// аналитика, настройки. Плоский список из десяти пунктов заставляет
// читать все десять каждый раз; группы дают зацепиться взглядом.

export function AppSidebar({
  user,
  vehicles = [],
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?: UserData
  vehicles?: FleetVehicle[]
}) {
  const { t } = useLang()
  const pathname = usePathname()

  const userData = user ?? { name: "Пользователь", email: "", avatar: "" }

  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: "Операции",
      items: [
        { title: t.nav.overview, url: "/dashboard", icon: IconDashboard },
        { title: t.nav.orders, url: "/dashboard/orders", icon: IconPackage },
        { title: "Биржа заявок", url: "/dashboard/dispatch", icon: IconTruckDelivery },
        { title: t.nav.routes, url: "/dashboard/routes", icon: IconMapPin },
        { title: t.nav.map, url: "/dashboard/map", icon: IconMap2 },
      ],
    },
    {
      label: "Ресурсы",
      items: [{ title: t.nav.customers, url: "/dashboard/customers", icon: IconUsers }],
    },
    {
      label: "Аналитика",
      items: [
        { title: t.nav.analytics, url: "/dashboard/analytics", icon: IconChartBar },
        { title: "Акимат", url: "/dashboard/akimat", icon: IconBuildingBank },
      ],
    },
  ]

  const secondary: NavItem[] = [
    { title: t.nav.settings, url: "/dashboard/settings", icon: IconSettings },
    { title: t.nav.help, url: "/dashboard/help", icon: IconHelp },
  ]

  const isActive = (url: string) =>
    url === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(url)

  const renderItems = (items: NavItem[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild tooltip={item.title} isActive={isActive(item.url)}>
          <Link href={item.url}>
            <item.icon />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ))

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link href="/dashboard">
                <IconTruckDelivery className="size-5!" />
                <span className="text-base font-semibold">Cargora</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Основное действие — всегда первым, как в консолях управления парком */}
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <NewOrderDialog label="Создать заявку" />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(group.items)}</SidebarMenu>
              {group.label === "Ресурсы" && <NavFleet vehicles={vehicles} />}
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup className="mt-auto py-1">
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(secondary)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
