import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireAdminAuth, getClientIP } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth()
    const ip = getClientIP(request)

    const { allianceId, name, tag, description } = await request.json()

    if (!allianceId) {
      return NextResponse.json({ error: "Alliance ID is required" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (tag !== undefined) updates.tag = tag
    if (description !== undefined) updates.description = description

    const { error } = await supabase.from("alliances").update(updates).eq("id", allianceId)

    if (error) {
      console.error("[v0] Error updating alliance:", error)

      await logAdminAction({
        admin_id: session.adminId,
        admin_email: session.email,
        action: "edit_alliance_failed",
        resource_type: "alliance",
        resource_id: allianceId.toString(),
        details: updates,
        ip_address: ip,
        user_agent: request.headers.get("user-agent") || "unknown",
        success: false,
        error_message: error.message,
      })

      return NextResponse.json({ error: "Failed to update alliance" }, { status: 500 })
    }

    await logAdminAction({
      admin_id: session.adminId,
      admin_email: session.email,
      action: "edit_alliance",
      resource_type: "alliance",
      resource_id: allianceId.toString(),
      details: updates,
      ip_address: ip,
      user_agent: request.headers.get("user-agent") || "unknown",
      success: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in admin edit alliance route:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.includes("Unauthorized") ? "Unauthorized" : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 },
    )
  }
}
