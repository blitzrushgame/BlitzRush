import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getCurrentUser } from "@/lib/auth/simple-auth"

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Get user's alliance membership
    const { data: membership, error: membershipError } = await supabase
      .from("alliance_members")
      .select("alliance_id, role")
      .eq("user_id", user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: "You are not in an alliance" }, { status: 400 })
    }

    // Only leaders can disband
    if (membership.role !== "leader") {
      return NextResponse.json({ error: "Only the leader can disband the alliance" }, { status: 403 })
    }

    // Delete all related data (cascade should handle this, but being explicit)
    const { data: members } = await supabase
      .from("alliance_members")
      .select("user_id")
      .eq("alliance_id", membership.alliance_id)

    if (members && members.length > 0) {
      const memberIds = members.map((m) => m.user_id)
      await supabase.from("users").update({ alliance_id: null }).in("id", memberIds)
    }

    // Delete alliance members
    await supabase.from("alliance_members").delete().eq("alliance_id", membership.alliance_id)

    // Delete join requests
    await supabase.from("alliance_join_requests").delete().eq("alliance_id", membership.alliance_id)

    // Delete invites
    await supabase.from("alliance_invites").delete().eq("alliance_id", membership.alliance_id)

    // Delete the alliance itself
    const { error: deleteError } = await supabase.from("alliances").delete().eq("id", membership.alliance_id)

    if (deleteError) {
      console.error("[v0] Error disbanding alliance:", deleteError)
      return NextResponse.json({ error: "Failed to disband alliance" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in disband route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
