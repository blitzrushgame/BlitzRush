import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Get pending invites for the user
  const { data: invites, error } = await supabase
    .from("alliance_invites")
    .select(
      `
      id,
      alliance_id,
      message,
      created_at,
      alliances (
        id,
        name,
        tag,
        description,
        member_count,
        max_members,
        total_points
      ),
      invited_by_user:users!alliance_invites_invited_by_fkey (
        id,
        username
      )
    `,
    )
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invites: invites || [] })
}
