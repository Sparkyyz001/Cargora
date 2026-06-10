import { Suspense } from "react"
import { getProfile } from "@/lib/actions/profile"
import { SettingsContent } from "./settings-content"

export default async function SettingsPage() {
  const profile = await getProfile()
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground text-sm">Загрузка настроек...</div>}>
      <SettingsContent profile={profile} />
    </Suspense>
  )
}
