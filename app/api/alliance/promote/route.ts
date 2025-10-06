import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId, role } = await request.json()

  const supabase = createServiceRoleClient()

  // Get current user's membership
  const { data: currentMembership, error: currentError } = await supabase
    .from("alliance_members")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (currentError || !currentMembership) {
    return NextResponse.json({ error: "You are not in an alliance" }, { status: 400 })
  }

  // Only leaders can promote/demote
  if (currentMembership.role !== "leader") {
    return NextResponse.json({ error: "Only leaders can promote or demote members" }, { status: 403 })
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

  // Update role
  const { error: updateError } = await supabase.from("alliance_members").update({ role }).eq("id", targetMembership.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
