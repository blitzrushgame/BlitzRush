import { cookies } from "next/headers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function requireAdminAuth() {
  try {
    const cookieStore = await cookies()
    const adminAuthCookie = cookieStore.get("admin_authenticated")
    const adminSessionCookie = cookieStore.get("admin_session")

    if (!adminAuthCookie || adminAuthCookie.value !== "true") {
      return null
    }

    // Get admin details from session cookie
    if (!adminSessionCookie) {
      return null
    }

    const sessionData = JSON.parse(adminSessionCookie.value)
    const adminId = sessionData.adminId

    if (!adminId) {
      return null
    }

    const supabase = createServiceRoleClient()

    // Check if user is an admin in admin_users table
    const { data: admin, error } = await supabase.from("admin_users").select("*").eq("id", adminId).single()

    if (error || !admin) {
      console.error("[v0] Admin not found:", error)
      return null
    }

    return admin
  } catch (error) {
    console.error("[v0] Error in requireAdminAuth:", error)
    return null
  }
}
