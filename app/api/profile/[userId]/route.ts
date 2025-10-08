import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: Request, { params }: { params: { userId: string } }) {
  const supabase = createServiceRoleClient()

  const { data: user, error } = await supabase
    .from("users")
    .select("id, username, bio, profile_picture, points, leaderboard_rank, alliance_id, block_alliance_invites")
    .eq("id", params.userId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get alliance name if user is in an alliance
  let allianceName = null
  if (user.alliance_id) {
    const { data: alliance } = await supabase.from("alliances").select("name, tag").eq("id", user.alliance_id).single()

    if (alliance) {
      allianceName = alliance.tag ? `[${alliance.tag}] ${alliance.name}` : alliance.name
    }
  }

  return NextResponse.json({
    ...user,
    alliance_name: allianceName,
  })
}

export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  const { bio, profile_picture } = await request.json()
  const supabase = createServiceRoleClient()

  const updateData: { bio?: string; profile_picture?: string } = {}
  if (bio !== undefined) updateData.bio = bio
  if (profile_picture !== undefined) updateData.profile_picture = profile_picture

  const { error } = await supabase.from("users").update(updateData).eq("id", params.userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
