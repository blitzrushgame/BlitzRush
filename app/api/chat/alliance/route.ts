import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const allianceId = searchParams.get("allianceId")
  const userId = searchParams.get("userId")

  if (!allianceId || !userId) {
    return NextResponse.json({ error: "Alliance ID and User ID required" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { data: userData } = await supabase
    .from("alliance_members")
    .select("alliance_id")
    .eq("user_id", userId)
    .eq("alliance_id", allianceId)
    .single()

  if (!userData) {
    return NextResponse.json({ error: "Unauthorized - not a member of this alliance" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("alliance_chat")
    .select("*")
    .eq("alliance_id", allianceId)
    .order("created_at", { ascending: true })
    .limit(5)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const { userId, username, allianceId, message } = await request.json()

  if (!userId || !username || !allianceId || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { data: userData } = await supabase
    .from("alliance_members")
    .select("alliance_id")
    .eq("user_id", userId)
    .eq("alliance_id", allianceId)
    .single()

  if (!userData) {
    return NextResponse.json({ error: "Unauthorized - not a member of this alliance" }, { status: 403 })
  }

  const { error } = await supabase.from("alliance_chat").insert({
    user_id: userId,
    username,
    alliance_id: allianceId,
    message,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
