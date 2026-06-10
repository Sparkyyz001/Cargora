"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  IconChartBar,
  IconHelp,
  IconMessageCircle,
  IconRoute,
  IconShieldCheck,
  IconTruckDelivery,
  IconUsersGroup,
} from "@tabler/icons-react"
import { Menu } from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface MenuItem {
  title: string
  url: string
  description?: string
  icon?: React.ReactNode
  items?: MenuItem[]
}

interface NavbarProps {
  logo?: {
    url: string
    title: string
  }
  menu?: MenuItem[]
  mobileExtraLinks?: {
    name: string
    url: string
  }[]
  auth?: {
    login: { text: string; url: string }
    signup: { text: string; url: string }
  }
}

const isExternal = (href: string) =>
  href.startsWith("http://") ||
  href.startsWith("https://") ||
  href.startsWith("mailto:") ||
  href.startsWith("tel:") ||
  href.startsWith("#")

export function Navbar1({
  logo = {
    url: "/",
    title: "Cargora",
  },
  menu = [
    {
      title: "Возможности",
      url: "#",
      items: [
        {
          title: "Паромные сервисы",
          description: "Перевозка грузов через 5 стран Каспия",
          icon: <IconTruckDelivery className="size-5 shrink-0" />,
          url: "/#services",
        },
        {
          title: "Маршруты и порты",
          description: "Все порты: KZ · TM · AZ · IR · RU",
          icon: <IconRoute className="size-5 shrink-0" />,
          url: "/#solutions",
        },
        {
          title: "Как это работает",
          description: "От заявки до доставки за 4 шага",
          icon: <IconUsersGroup className="size-5 shrink-0" />,
          url: "/#how-it-works",
        },
        {
          title: "Аналитика",
          description: "Дашборды и отчёты в реальном времени",
          icon: <IconChartBar className="size-5 shrink-0" />,
          url: "/dashboard",
        },
      ],
    },
    {
      title: "Ресурсы",
      url: "#",
      items: [
        {
          title: "FAQ и помощь",
          description: "Ответы на частые вопросы, инструкции",
          icon: <IconHelp className="size-5 shrink-0" />,
          url: "/faq",
        },
        {
          title: "Связаться с нами",
          description: "Telegram и Email — отвечаем за 1 час",
          icon: <IconMessageCircle className="size-5 shrink-0" />,
          url: "mailto:support@cargora.kz",
        },
        {
          title: "Конфиденциальность",
          description: "Как мы защищаем ваши данные",
          icon: <IconShieldCheck className="size-5 shrink-0" />,
          url: "/privacy",
        },
      ],
    },
    { title: "Маршруты", url: "/#solutions" },
    { title: "FAQ", url: "/faq" },
  ],
  mobileExtraLinks = [
    { name: "Условия", url: "/terms" },
    { name: "Конфиденциальность", url: "/privacy" },
    { name: "Контакты", url: "mailto:support@cargora.kz" },
    { name: "Помощь", url: "/faq" },
  ],
  auth = {
    login: { text: "Войти", url: "/login" },
    signup: { text: "Начать бесплатно", url: "/register" },
  },
}: NavbarProps) {
  const pathname = usePathname()
  const isHome = pathname === "/"

  const [scrolled, setScrolled] = React.useState(false)
  const [visible, setVisible] = React.useState(true)
  const lastY = React.useRef(0)

  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 60)
      if (y < 10) {
        setVisible(true)
      } else if (y > lastY.current + 6) {
        setVisible(false)   // scrolling down
      } else if (y < lastY.current - 4) {
        setVisible(true)    // scrolling up
      }
      lastY.current = y
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Dark mode only on home page before scroll
  const dark = isHome && !scrolled

  return (
    <section
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        visible ? "translate-y-0" : "-translate-y-full",
        dark
          ? "border-b border-white/10 bg-black/30 backdrop-blur-md"
          : "border-b border-border/40 bg-background/90 shadow-sm backdrop-blur-xl"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-3 lg:px-6">
        {/* Desktop */}
        <nav className="hidden items-center justify-between lg:flex">
          <div className="flex items-center gap-6">
            <Link href={logo.url} className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <IconTruckDelivery className="size-5" />
              </div>
              <span className={cn("text-lg font-semibold tracking-tight", dark ? "text-white" : "text-foreground")}>
                {logo.title}
              </span>
            </Link>

            <NavigationMenu>
              <NavigationMenuList>
                {menu.map((item) => renderMenuItem(item, dark))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn(dark && "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white")}
            >
              <Link href={auth.login.url}>{auth.login.text}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={auth.signup.url}>{auth.signup.text}</Link>
            </Button>
          </div>
        </nav>

        {/* Mobile */}
        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <Link href={logo.url} className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <IconTruckDelivery className="size-5" />
              </div>
              <span className={cn("text-lg font-semibold", dark ? "text-white" : "text-foreground")}>{logo.title}</span>
            </Link>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    <Link href={logo.url} className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <IconTruckDelivery className="size-5" />
                      </div>
                      <span className="text-lg font-semibold">{logo.title}</span>
                    </Link>
                  </SheetTitle>
                </SheetHeader>

                <div className="my-6 flex flex-col gap-6">
                  <Accordion
                    type="single"
                    collapsible
                    className="flex w-full flex-col gap-4"
                  >
                    {menu.map((item) => renderMobileMenuItem(item))}
                  </Accordion>

                  <div className="border-t py-4">
                    <div className="grid grid-cols-2 justify-start">
                      {mobileExtraLinks.map((link) => (
                        <SafeLink
                          key={link.url}
                          href={link.url}
                          className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-accent-foreground"
                        >
                          {link.name}
                        </SafeLink>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button asChild variant="outline">
                      <Link href={auth.login.url}>{auth.login.text}</Link>
                    </Button>
                    <Button asChild>
                      <Link href={auth.signup.url}>{auth.signup.text}</Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Безопасный Link: использует next/link для внутренних, обычный <a> для внешних/хэш. */
function SafeLink({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  if (isExternal(href)) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}

function renderMenuItem(item: MenuItem, scrolled = true) {
  const triggerClass = scrolled ? "" : "bg-transparent text-white/80 hover:bg-white/10 hover:text-white data-[active]:bg-white/10 data-[state=open]:bg-white/10"
  if (item.items) {
    return (
      <NavigationMenuItem key={item.title} className="text-muted-foreground">
        <NavigationMenuTrigger className={triggerClass}>{item.title}</NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul className="w-80 p-3">
            <NavigationMenuLink asChild>
              <div>
                {item.items.map((subItem) => (
                  <SafeLink
                    key={subItem.title}
                    href={subItem.url}
                    className="flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted hover:text-accent-foreground"
                  >
                    {subItem.icon}
                    <div>
                      <div className="text-sm font-semibold">
                        {subItem.title}
                      </div>
                      {subItem.description && (
                        <p className="text-sm leading-snug text-muted-foreground">
                          {subItem.description}
                        </p>
                      )}
                    </div>
                  </SafeLink>
                ))}
              </div>
            </NavigationMenuLink>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
    )
  }

  return (
    <SafeLink
      key={item.title}
      href={item.url}
      className={cn(
        "group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
        scrolled
          ? "bg-background text-muted-foreground hover:bg-muted hover:text-accent-foreground"
          : "bg-transparent text-white/80 hover:bg-white/10 hover:text-white"
      )}
    >
      {item.title}
    </SafeLink>
  )
}

function renderMobileMenuItem(item: MenuItem) {
  if (item.items) {
    return (
      <AccordionItem key={item.title} value={item.title} className="border-b-0">
        <AccordionTrigger className="py-0 font-semibold hover:no-underline">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="mt-2">
          {item.items.map((subItem) => (
            <SafeLink
              key={subItem.title}
              href={subItem.url}
              className="flex select-none gap-4 rounded-md p-3 leading-none outline-none transition-colors hover:bg-muted hover:text-accent-foreground"
            >
              {subItem.icon}
              <div>
                <div className="text-sm font-semibold">{subItem.title}</div>
                {subItem.description && (
                  <p className="text-sm leading-snug text-muted-foreground">
                    {subItem.description}
                  </p>
                )}
              </div>
            </SafeLink>
          ))}
        </AccordionContent>
      </AccordionItem>
    )
  }

  return (
    <SafeLink key={item.title} href={item.url} className="font-semibold">
      {item.title}
    </SafeLink>
  )
}
