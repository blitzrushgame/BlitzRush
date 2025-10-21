import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireAdminAuth } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

export async function POST(request: Request) {
  const admin = await requireAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId, muteType, duration, reason } = await request.json()

    if (!userId || !muteType || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Calculate mute expiration for temporary mutes
    let mutedUntil = null
    if (muteType === "temporary" && duration) {
      const now = new Date()
      mutedUntil = new Date(now.getTime() + duration * 60 * 60 * 1000).toISOString()
    }

    // Update user mute status
    const { error: updateError } = await supabase
      .from("users")
      .update({
        is_muted: true,
        mute_type: muteType,
        mute_reason: reason,
        muted_until: mutedUntil,
        muted_at: new Date().toISOString(),
        muted_by_admin_id: admin.id,
      })
      .eq("id", userId)

    if (updateError) {
      console.error("[v0] Error muting user:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log moderation action
    await supabase.from("moderation_log").insert({
      admin_id: admin.id,
      action_type: "mute",
      target_user_id: userId,
      reason,
      duration_type: muteType,
      duration_until: mutedUntil,
    })

    // Log admin action
    await logAdminAction(admin.id, "mute_user", request, {
      userId,
      muteType,
      duration,
      reason,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error in mute route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
