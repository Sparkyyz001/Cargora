"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import { updateProfile } from "@/lib/actions/profile"
import type { BillingData } from "@/lib/actions/billing"
import { BillingTab } from "./billing-tab"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

type ProfileData = {
  name: string
  email: string
  avatar: string
  company: string
  phone: string
} | null

export function SettingsContent({ profile, billing }: { profile: ProfileData; billing: BillingData }) {
  const { theme, setTheme } = useTheme()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab") ?? "profile"

  const [company, setCompany] = React.useState(profile?.company ?? "")
  const [phone, setPhone] = React.useState(profile?.phone ?? "")
  const [notifyOrders, setNotifyOrders] = React.useState(true)
  const [notifyDelays, setNotifyDelays] = React.useState(true)
  const [notifyEmail, setNotifyEmail] = React.useState(false)
  const [autoAssign, setAutoAssign] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  async function handleSaveProfile() {
    setSaving(true)
    const fd = new FormData()
    fd.set("company", company)
    fd.set("phone", phone)
    const result = await updateProfile(fd)
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Профиль сохранён")
    }
  }

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <Tabs defaultValue={tabParam} key={tabParam} className="w-full max-w-3xl">
        <TabsList>
          <TabsTrigger value="profile">Профиль</TabsTrigger>
          <TabsTrigger value="notifications">Уведомления</TabsTrigger>
          <TabsTrigger value="billing">Тариф и оплата</TabsTrigger>
          <TabsTrigger value="system">Система</TabsTrigger>
        </TabsList>

        {/* Профиль */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Профиль компании</CardTitle>
              <CardDescription>
                Вы вошли как <span className="font-medium text-foreground">{profile?.email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Имя</Label>
                <Input value={profile?.name ?? ""} disabled className="bg-muted/50" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="company">Название компании</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="ООО «Моя Компания»"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 999 000-00-00"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Сохранение..." : "Сохранить"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Уведомления */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Уведомления</CardTitle>
              <CardDescription>Выберите события, о которых хотите получать сигналы</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="n1">Новые заказы</Label>
                <Switch id="n1" checked={notifyOrders} onCheckedChange={setNotifyOrders} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="n2">Задержки доставки</Label>
                <Switch id="n2" checked={notifyDelays} onCheckedChange={setNotifyDelays} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="n3">Дублировать на email</Label>
                <Switch id="n3" checked={notifyEmail} onCheckedChange={setNotifyEmail} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => toast.success("Настройки уведомлений сохранены")}>
                Сохранить
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Тариф и оплата */}
        <TabsContent value="billing">
          <BillingTab
            subscription={billing.subscription}
            payments={billing.payments}
            setupError={billing.setupError}
          />
        </TabsContent>

        {/* Система */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>Система</CardTitle>
              <CardDescription>Тема оформления и параметры работы</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Тема оформления</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Тема" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Светлая</SelectItem>
                    <SelectItem value="dark">Тёмная</SelectItem>
                    <SelectItem value="system">Системная</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="auto">Автоназначение курьеров</Label>
                <Switch id="auto" checked={autoAssign} onCheckedChange={setAutoAssign} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => toast.success("Параметры системы сохранены")}>
                Сохранить
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
