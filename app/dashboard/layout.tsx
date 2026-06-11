import { AppSidebar } from "@/components/app-sidebar"
import { OrderStatusListener } from "@/components/order-status-listener"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ensureUserData } from "@/lib/actions/seed"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Автоматически заполняем данными при первом входе
  await ensureUserData()

  const userData = {
    name:
      user?.user_metadata?.full_name ??
      user?.user_metadata?.name ??
      user?.email?.split("@")[0] ??
      "Пользователь",
    email: user?.email ?? "",
    avatar: user?.user_metadata?.avatar_url ?? "",
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={userData} />
      <SidebarInset>
        <SiteHeader />
        <OrderStatusListener />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
