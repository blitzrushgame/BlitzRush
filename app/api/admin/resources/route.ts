import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const isAdminAuthenticated = cookieStore.get("admin_authenticated")?.value === "true"

  if (!isAdminAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId, resources } = await request.json()

  if (!userId || !resources) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // Get current game data
  const { data: userData, error: fetchError } = await supabase
    .from("users")
    .select("game_data")
    .eq("id", userId)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Update resources in game data
  const gameData = (userData?.game_data as any) || {}
  gameData.resources = resources

  // Save updated game data
  const { error: updateError } = await supabase.from("users").update({ game_data: gameData }).eq("id", userId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
