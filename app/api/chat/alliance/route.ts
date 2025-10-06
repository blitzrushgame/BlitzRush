import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const allianceId = searchParams.get("allianceId")

  if (!allianceId) {
    return NextResponse.json({ error: "Alliance ID required" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("alliance_chat")
    .select("*")
    .eq("alliance_id", allianceId)
    .order("created_at", { ascending: true })
    .limit(50)

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
