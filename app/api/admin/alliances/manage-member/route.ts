import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireAdminAuth, getClientIP } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth()
    const ip = getClientIP(request)

    const { action, allianceId, userId, username } = await request.json()

    const supabase = createServiceRoleClient()

    if (action === "add") {
      // Find user by username if userId not provided
      let targetUserId = userId
      if (!targetUserId && username) {
        const { data: user } = await supabase.from("users").select("id").eq("username", username).single()
        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 })
        }
        targetUserId = user.id
      }

      if (!targetUserId) {
        return NextResponse.json({ error: "User ID or username is required" }, { status: 400 })
      }

      // Check if user is already in an alliance
      const { data: existingMembership } = await supabase
        .from("alliance_members")
        .select("id")
        .eq("user_id", targetUserId)
        .single()

      if (existingMembership) {
        return NextResponse.json({ error: "User is already in an alliance" }, { status: 400 })
      }

      // Add user to alliance
      const { error } = await supabase.from("alliance_members").insert({
        alliance_id: allianceId,
        user_id: targetUserId,
        role: "member",
      })

      if (error) {
        console.error("[v0] Error adding member:", error)

        await logAdminAction({
          admin_id: session.adminId,
          admin_email: session.email,
          action: "add_alliance_member_failed",
          resource_type: "alliance",
          resource_id: allianceId.toString(),
          details: { userId: targetUserId, username },
          ip_address: ip,
          user_agent: request.headers.get("user-agent") || "unknown",
          success: false,
          error_message: error.message,
        })

        return NextResponse.json({ error: "Failed to add member" }, { status: 500 })
      }

      await logAdminAction({
        admin_id: session.adminId,
        admin_email: session.email,
        action: "add_alliance_member",
        resource_type: "alliance",
        resource_id: allianceId.toString(),
        details: { userId: targetUserId, username },
        ip_address: ip,
        user_agent: request.headers.get("user-agent") || "unknown",
        success: true,
      })

      return NextResponse.json({ success: true })
    } else if (action === "remove") {
      if (!userId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 })
      }

      // Remove user from alliance
      const { error } = await supabase
        .from("alliance_members")
        .delete()
        .eq("alliance_id", allianceId)
        .eq("user_id", userId)

      if (error) {
        console.error("[v0] Error removing member:", error)

        await logAdminAction({
          admin_id: session.adminId,
          admin_email: session.email,
          action: "remove_alliance_member_failed",
          resource_type: "alliance",
          resource_id: allianceId.toString(),
          details: { userId },
          ip_address: ip,
          user_agent: request.headers.get("user-agent") || "unknown",
          success: false,
          error_message: error.message,
        })

        return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
      }

      await logAdminAction({
        admin_id: session.adminId,
        admin_email: session.email,
        action: "remove_alliance_member",
        resource_type: "alliance",
        resource_id: allianceId.toString(),
        details: { userId },
        ip_address: ip,
        user_agent: request.headers.get("user-agent") || "unknown",
        success: true,
      })

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] Error in admin manage member route:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.includes("Unauthorized") ? "Unauthorized" : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 },
    )
  }
}
