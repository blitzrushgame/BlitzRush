import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Get user's membership
  const { data: membership, error: membershipError } = await supabase
    .from("alliance_members")
    .select("*, alliances(*)")
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError || !membership) {
    return NextResponse.json({ error: "You are not in an alliance" }, { status: 400 })
  }

  // Leaders cannot leave, they must disband or transfer leadership
  if (membership.role === "leader") {
    return NextResponse.json(
      { error: "Leaders cannot leave. Transfer leadership or disband the alliance." },
      { status: 400 },
    )
  }

  // Remove member
  const { error: deleteError } = await supabase.from("alliance_members").delete().eq("user_id", user.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  await supabase.from("users").update({ alliance_id: null }).eq("id", user.id)

  // Update member count
  await supabase
    .from("alliances")
    .update({ member_count: membership.alliances.member_count - 1 })
    .eq("id", membership.alliance_id)

  return NextResponse.json({ success: true })
}
