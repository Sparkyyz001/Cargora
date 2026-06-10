"use client"

import { usePathname } from "next/navigation"

import { useLang } from "@/lib/use-lang"
import { LangToggle } from "@/components/lang-toggle"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  const pathname = usePathname()
  const { t } = useLang()

  const TITLES: Record<string, string> = {
    "/dashboard": t.header.overview,
    "/dashboard/orders": t.header.orders,
    "/dashboard/routes": t.header.routes,
    "/dashboard/fleet": t.header.fleet,
    "/dashboard/analytics": t.header.analytics,
    "/dashboard/customers": t.header.customers,
    "/dashboard/map": t.header.map,
    "/dashboard/dispatch": t.header.dispatch,
    "/dashboard/settings": t.header.settings,
    "/dashboard/help": t.header.help,
  }

  const title = TITLES[pathname] ?? t.header.overview

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-1">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
