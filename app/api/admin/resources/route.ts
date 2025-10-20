import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireAdminAuth, getClientIP } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth()
    const ip = getClientIP(request)

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
    const oldResources = gameData.resources || {}
    gameData.resources = resources

    // Save updated game data
    const { error: updateError } = await supabase.from("users").update({ game_data: gameData }).eq("id", userId)

    if (updateError) {
      await logAdminAction({
        admin_id: session.adminId,
        admin_email: session.email,
        action: "update_resources_failed",
        resource_type: "user",
        resource_id: userId.toString(),
        details: { oldResources, newResources: resources },
        ip_address: ip,
        user_agent: request.headers.get("user-agent") || "unknown",
        success: false,
        error_message: updateError.message,
      })

      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await logAdminAction({
      admin_id: session.adminId,
      admin_email: session.email,
      action: "update_resources",
      resource_type: "user",
      resource_id: userId.toString(),
      details: { oldResources, newResources: resources },
      ip_address: ip,
      user_agent: request.headers.get("user-agent") || "unknown",
      success: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating resources:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.includes("Unauthorized") ? "Unauthorized" : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 },
    )
  }
}
