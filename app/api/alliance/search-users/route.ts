import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query || query.length < 2) {
    return NextResponse.json({ users: [] })
  }

  const supabase = createServiceRoleClient()

  // Check if user is leader or co-leader
  const { data: membership } = await supabase
    .from("alliance_members")
    .select("role, alliance_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!membership || (membership.role !== "leader" && membership.role !== "co-leader")) {
    return NextResponse.json({ error: "Only leaders and co-leaders can invite members" }, { status: 403 })
  }

  // Search for users by username (case-insensitive)
  const { data: users, error } = await supabase
    .from("users")
    .select("id, username, points, alliance_id")
    .ilike("username", `%${query}%`)
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter out users already in an alliance
  const availableUsers = users?.filter((u) => !u.alliance_id && u.id !== user.id) || []

  return NextResponse.json({ users: availableUsers })
}
