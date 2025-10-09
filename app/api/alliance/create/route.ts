import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, tag, description, isPublic, minPoints } = await request.json()

  // Validate inputs
  if (!name || !tag) {
    return NextResponse.json({ error: "Name and tag are required" }, { status: 400 })
  }

  if (tag.length < 2 || tag.length > 5) {
    return NextResponse.json({ error: "Tag must be 2-5 characters" }, { status: 400 })
  }

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

  // Check if alliance name or tag already exists
  const { data: existingAlliance } = await supabase
    .from("alliances")
    .select("id")
    .or(`name.ilike.${name},tag.ilike.${tag}`)
    .maybeSingle()

  if (existingAlliance) {
    return NextResponse.json({ error: "Alliance name or tag already exists" }, { status: 400 })
  }

  // Create alliance
  const { data: alliance, error: allianceError } = await supabase
    .from("alliances")
    .insert({
      name,
      tag: tag.toUpperCase(),
      description: description || null,
      leader_id: user.id,
      is_public: isPublic,
      min_points_required: minPoints || 0,
      member_count: 1,
    })
    .select()
    .single()

  if (allianceError) {
    return NextResponse.json({ error: allianceError.message }, { status: 500 })
  }

  // Add creator as leader
  const { error: memberError } = await supabase.from("alliance_members").insert({
    alliance_id: alliance.id,
    user_id: user.id,
    role: "leader",
  })

  if (memberError) {
    // Rollback alliance creation
    await supabase.from("alliances").delete().eq("id", alliance.id)
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  await supabase.from("users").update({ alliance_id: alliance.id }).eq("id", user.id)

  return NextResponse.json({ success: true, allianceId: alliance.id })
}
