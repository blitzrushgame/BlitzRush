import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { description, minPointsRequired, isPublic } = await request.json()

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

  // Only leaders can update settings
  if (currentMembership.role !== "leader") {
    return NextResponse.json({ error: "Only leaders can update alliance settings" }, { status: 403 })
  }

  // Update alliance settings
  const { error: updateError } = await supabase
    .from("alliances")
    .update({
      description,
      min_points_required: minPointsRequired,
      is_public: isPublic,
    })
    .eq("id", currentMembership.alliance_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
