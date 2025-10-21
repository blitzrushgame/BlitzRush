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
    const { userId, banType, duration, reason } = await request.json()

    if (!userId || !banType || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Calculate ban expiration for temporary bans
    let bannedUntil = null
    if (banType === "temporary" && duration) {
      const now = new Date()
      bannedUntil = new Date(now.getTime() + duration * 60 * 60 * 1000).toISOString()
    }

    // Update user ban status
    const { error: updateError } = await supabase
      .from("users")
      .update({
        is_banned: true,
        ban_type: banType,
        ban_reason: reason,
        banned_until: bannedUntil,
        banned_at: new Date().toISOString(),
        banned_by_admin_id: admin.id,
      })
      .eq("id", userId)

    if (updateError) {
      console.error("[v0] Error banning user:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log moderation action
    await supabase.from("moderation_log").insert({
      admin_id: admin.id,
      action_type: "ban",
      target_user_id: userId,
      reason,
      duration_type: banType,
      duration_until: bannedUntil,
    })

    // Log admin action
    await logAdminAction(admin.id, "ban_user", request, {
      userId,
      banType,
      duration,
      reason,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error in ban route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
