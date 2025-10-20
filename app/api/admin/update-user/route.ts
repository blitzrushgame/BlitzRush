import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireAdminAuth, getClientIP } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth()
    const ip = getClientIP(request)

    const { userId, username, password } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const updates: any = {}

    if (username) {
      updates.username = username
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10)
      updates.password = passwordHash
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    const { error } = await supabase.from("users").update(updates).eq("id", userId)

    if (error) {
      await logAdminAction({
        admin_id: session.adminId,
        admin_email: session.email,
        action: "update_user_failed",
        resource_type: "user",
        resource_id: userId.toString(),
        details: { username, passwordChanged: !!password },
        ip_address: ip,
        user_agent: request.headers.get("user-agent") || "unknown",
        success: false,
        error_message: error.message,
      })

      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await logAdminAction({
      admin_id: session.adminId,
      admin_email: session.email,
      action: "update_user",
      resource_type: "user",
      resource_id: userId.toString(),
      details: { username, passwordChanged: !!password },
      ip_address: ip,
      user_agent: request.headers.get("user-agent") || "unknown",
      success: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating user:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 },
    )
  }
}
