import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireAdminAuth } from "@/lib/admin/auth"

export async function GET() {
  const admin = await requireAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  const { data: users, error } = await supabase
    .from("users")
    .select(
      "id, username, ip_address, created_at, is_banned, ban_type, ban_reason, banned_until, is_muted, mute_type, mute_reason, muted_until",
    )
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(users)
}
