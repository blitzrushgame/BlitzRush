import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireAdminAuth } from "@/lib/admin/auth"

export async function GET() {
  const authResult = await requireAdminAuth()
  if (!authResult.authenticated || !authResult.admin) {
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
