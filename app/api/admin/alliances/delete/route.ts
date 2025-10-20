import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireAdminAuth, getClientIP } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth()
    const ip = getClientIP(request)

    const { allianceId } = await request.json()

    if (!allianceId) {
      return NextResponse.json({ error: "Alliance ID is required" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Get alliance details before deletion for audit log
    const { data: alliance } = await supabase.from("alliances").select("name, tag").eq("id", allianceId).single()

    // Delete all related data
    await supabase.from("alliance_members").delete().eq("alliance_id", allianceId)
    await supabase.from("alliance_join_requests").delete().eq("alliance_id", allianceId)
    await supabase.from("alliance_invites").delete().eq("alliance_id", allianceId)

    // Delete the alliance
    const { error } = await supabase.from("alliances").delete().eq("id", allianceId)

    if (error) {
      console.error("[v0] Error deleting alliance:", error)

      await logAdminAction({
        admin_id: session.adminId,
        admin_email: session.email,
        action: "delete_alliance_failed",
        resource_type: "alliance",
        resource_id: allianceId.toString(),
        details: { allianceName: alliance?.name, allianceTag: alliance?.tag },
        ip_address: ip,
        user_agent: request.headers.get("user-agent") || "unknown",
        success: false,
        error_message: error.message,
      })

      return NextResponse.json({ error: "Failed to delete alliance" }, { status: 500 })
    }

    await logAdminAction({
      admin_id: session.adminId,
      admin_email: session.email,
      action: "delete_alliance",
      resource_type: "alliance",
      resource_id: allianceId.toString(),
      details: { allianceName: alliance?.name, allianceTag: alliance?.tag },
      ip_address: ip,
      user_agent: request.headers.get("user-agent") || "unknown",
      success: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in admin delete alliance route:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.includes("Unauthorized") ? "Unauthorized" : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 },
    )
  }
}
