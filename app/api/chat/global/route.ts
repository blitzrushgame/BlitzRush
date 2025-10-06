import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET() {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("global_chat")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(5)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const { userId, username, message } = await request.json()

  if (!userId || !username || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { error } = await supabase.from("global_chat").insert({
    user_id: userId,
    username,
    message,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
