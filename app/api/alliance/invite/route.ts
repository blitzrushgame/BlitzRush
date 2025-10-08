import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId, message } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // Check if user is leader or co-leader
  const { data: membership } = await supabase
    .from("alliance_members")
    .select("role, alliance_id, alliances(name, tag, member_count, max_members)")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!membership || (membership.role !== "leader" && membership.role !== "co-leader")) {
    return NextResponse.json({ error: "Only leaders and co-leaders can invite members" }, { status: 403 })
  }

  // Check if alliance is full
  const alliance = membership.alliances as any
  if (alliance.member_count >= alliance.max_members) {
    return NextResponse.json({ error: "Alliance is full" }, { status: 400 })
  }

  const { data: targetUser } = await supabase
    .from("users")
    .select("alliance_id, block_alliance_invites")
    .eq("id", userId)
    .single()

  if (targetUser?.block_alliance_invites) {
    return NextResponse.json({ error: "This user has blocked alliance invites" }, { status: 400 })
  }

  // Check if invite already exists
  const { data: existingInvite } = await supabase
    .from("alliance_invites")
    .select("id")
    .eq("alliance_id", membership.alliance_id)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle()

  if (existingInvite) {
    return NextResponse.json({ error: "Invite already sent to this user" }, { status: 400 })
  }

  // Create invite
  const { error: inviteError } = await supabase.from("alliance_invites").insert({
    alliance_id: membership.alliance_id,
    user_id: userId,
    invited_by: user.id,
    message: message || null,
    status: "pending",
  })

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
