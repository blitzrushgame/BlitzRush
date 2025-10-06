import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET() {
  const cookieStore = await cookies()
  const isAdminAuthenticated = cookieStore.get("admin_authenticated")?.value === "true"

  if (!isAdminAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  const { data: users, error } = await supabase
    .from("users")
    .select("id, username, ip_address, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(users)
}
