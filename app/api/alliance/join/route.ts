import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { allianceId } = await request.json()

  const supabase = createServiceRoleClient()

  // Check if user is already in an alliance
  const { data: existingMembership } = await supabase
    .from("alliance_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (existingMembership) {
    return NextResponse.json({ error: "You are already in an alliance" }, { status: 400 })
  }

  // Get alliance details
  const { data: alliance, error: allianceError } = await supabase
    .from("alliances")
    .select("*")
    .eq("id", allianceId)
    .single()

  if (allianceError || !alliance) {
    return NextResponse.json({ error: "Alliance not found" }, { status: 404 })
  }

  // Check if alliance is full
  if (alliance.member_count >= alliance.max_members) {
    return NextResponse.json({ error: "Alliance is full" }, { status: 400 })
  }

  // If public, join directly
  if (alliance.is_public) {
    const { error: memberError } = await supabase.from("alliance_members").insert({
      alliance_id: allianceId,
      user_id: user.id,
      role: "member",
    })

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    // Update member count
    await supabase
      .from("alliances")
      .update({ member_count: alliance.member_count + 1 })
      .eq("id", allianceId)

    return NextResponse.json({ success: true })
  }

  // If private, create join request
  const { error: requestError } = await supabase.from("alliance_join_requests").insert({
    alliance_id: allianceId,
    user_id: user.id,
    status: "pending",
  })

  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: "Join request sent" })
}
