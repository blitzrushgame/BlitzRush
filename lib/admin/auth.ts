import { cookies } from "next/headers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function requireAdminAuth() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie) {
      return null
    }

    const sessionData = JSON.parse(sessionCookie.value)
    const userId = sessionData.userId

    if (!userId) {
      return null
    }

    const supabase = createServiceRoleClient()

    // Check if user is an admin
    const { data: admin, error } = await supabase
      .from("admins")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single()

    if (error || !admin) {
      return null
    }

    return admin
  } catch (error) {
    console.error("[v0] Error in requireAdminAuth:", error)
    return null
  }
}
