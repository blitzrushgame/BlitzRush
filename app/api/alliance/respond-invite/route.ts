import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { inviteId, action } = await request.json()

  if (!inviteId || !action || !["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // Get the invite
  const { data: invite, error: inviteError } = await supabase
    .from("alliance_invites")
    .select("*, alliances(member_count, max_members)")
    .eq("id", inviteId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 })
  }

  if (action === "reject") {
    // Update invite status to rejected
    await supabase.from("alliance_invites").update({ status: "rejected" }).eq("id", inviteId)

    return NextResponse.json({ success: true })
  }

  // Accept invite
  // Check if user is already in an alliance
  const { data: currentUser } = await supabase.from("users").select("alliance_id").eq("id", user.id).single()

  if (currentUser?.alliance_id) {
    return NextResponse.json({ error: "You are already in an alliance" }, { status: 400 })
  }

  // Check if alliance is full
  const alliance = invite.alliances as any
  if (alliance.member_count >= alliance.max_members) {
    return NextResponse.json({ error: "Alliance is full" }, { status: 400 })
  }

  // Add user to alliance
  const { error: memberError } = await supabase.from("alliance_members").insert({
    alliance_id: invite.alliance_id,
    user_id: user.id,
    role: "member",
  })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  // Update user's alliance_id
  await supabase.from("users").update({ alliance_id: invite.alliance_id }).eq("id", user.id)

  // Update alliance member count
  await supabase
    .from("alliances")
    .update({ member_count: alliance.member_count + 1 })
    .eq("id", invite.alliance_id)

  // Update invite status
  await supabase.from("alliance_invites").update({ status: "accepted" }).eq("id", inviteId)

  return NextResponse.json({ success: true })
}
