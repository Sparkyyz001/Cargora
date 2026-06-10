"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function getProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return {
    name:
      profile?.full_name ??
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email?.split("@")[0] ??
      "Пользователь",
    email: user.email ?? "",
    avatar: user.user_metadata?.avatar_url ?? "",
    company: profile?.company ?? "",
    phone: profile?.phone ?? "",
    role: (profile?.role ?? user.user_metadata?.role ?? null) as
      | "sender" | "carrier" | "dispatcher" | null,
  }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Не авторизован" }

  const company = formData.get("company") as string
  const phone = formData.get("phone") as string

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, company, phone })

  if (error) return { error: error.message }

  revalidatePath("/dashboard/settings")
  return { success: true }
}
