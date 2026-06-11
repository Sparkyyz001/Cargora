import { Suspense } from "react"
import { getBilling } from "@/lib/actions/billing"
import { getProfile } from "@/lib/actions/profile"
import { SettingsContent } from "./settings-content"

export default async function SettingsPage() {
  const [profile, billing] = await Promise.all([getProfile(), getBilling()])
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground text-sm">Загрузка настроек...</div>}>
      <SettingsContent profile={profile} billing={billing} />
    </Suspense>
  )
}
