"use server"

import { cookies } from "next/headers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("user_session")

  if (!sessionCookie) {
    return null
  }

  try {
    const session = JSON.parse(sessionCookie.value)

    // Get the user profile from the database
    const supabase = createServiceRoleClient()
    const { data: profile } = await supabase.from("users").select("*").eq("id", session.userId).maybeSingle()

    return profile
  } catch (error) {
    console.error("[v0] Error getting current user:", error)
    return null
  }
}
