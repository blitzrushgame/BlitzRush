import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { requestId, userId, action } = await request.json()

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
    return NextResponse.json({ error: "You don't have permission to manage join requests" }, { status: 403 })
  }

  if (action === "approve") {
    // Check if alliance is full
    if (currentMembership.alliances.member_count >= currentMembership.alliances.max_members) {
      return NextResponse.json({ error: "Alliance is full" }, { status: 400 })
    }

    // Add member
    const { error: memberError } = await supabase.from("alliance_members").insert({
      alliance_id: currentMembership.alliance_id,
      user_id: userId,
      role: "member",
    })

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    await supabase.from("users").update({ alliance_id: currentMembership.alliance_id }).eq("id", userId)

    // Update member count
    await supabase
      .from("alliances")
      .update({ member_count: currentMembership.alliances.member_count + 1 })
      .eq("id", currentMembership.alliance_id)

    // Update request status
    await supabase.from("alliance_join_requests").update({ status: "approved" }).eq("id", requestId)
  } else {
    // Reject request
    await supabase.from("alliance_join_requests").update({ status: "rejected" }).eq("id", requestId)
  }

  return NextResponse.json({ success: true })
}
