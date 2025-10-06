import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await request.json()

  const supabase = createServiceRoleClient()

  // Get current user's membership
  const { data: currentMembership, error: currentError } = await supabase
    .from("alliance_members")
    .select("*, alliances(*)")
    .eq("user_id", user.id)
    .maybeSingle()

  if (currentError || !currentMembership) {
    return NextResponse.json({ error: "You are not in an alliance" }, { status: 400 })
  }

  // Check permissions
  if (currentMembership.role !== "leader" && currentMembership.role !== "co-leader") {
    return NextResponse.json({ error: "You don't have permission to kick members" }, { status: 403 })
  }

  // Get target member
  const { data: targetMembership, error: targetError } = await supabase
    .from("alliance_members")
    .select("*")
    .eq("user_id", userId)
    .eq("alliance_id", currentMembership.alliance_id)
    .maybeSingle()

  if (targetError || !targetMembership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 })
  }

  // Cannot kick leader
  if (targetMembership.role === "leader") {
    return NextResponse.json({ error: "Cannot kick the leader" }, { status: 400 })
  }

  // Co-leaders can only kick regular members
  if (currentMembership.role === "co-leader" && targetMembership.role === "co-leader") {
    return NextResponse.json({ error: "Co-leaders cannot kick other co-leaders" }, { status: 403 })
  }

  // Remove member
  const { error: deleteError } = await supabase.from("alliance_members").delete().eq("id", targetMembership.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Update member count
  await supabase
    .from("alliances")
    .update({ member_count: currentMembership.alliances.member_count - 1 })
    .eq("id", currentMembership.alliance_id)

  return NextResponse.json({ success: true })
}
