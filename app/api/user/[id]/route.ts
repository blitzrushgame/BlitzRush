import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("users")
    .select("id, username, alliance_id, is_banned, is_muted, mute_reason")
    .eq("auth_user_id", id)
    .single()

  if (error) {
    console.error("[v0] Error fetching user:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
