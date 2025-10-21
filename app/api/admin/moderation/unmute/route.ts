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
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Remove mute from user
    const { error: updateError } = await supabase
      .from("users")
      .update({
        is_muted: false,
        mute_type: null,
        mute_reason: null,
        muted_until: null,
        muted_at: null,
        muted_by_admin_id: null,
      })
      .eq("id", userId)

    if (updateError) {
      console.error("[v0] Error unmuting user:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log moderation action
    await supabase.from("moderation_log").insert({
      admin_id: admin.id,
      action_type: "unmute",
      target_user_id: userId,
    })

    // Log admin action
    await logAdminAction(admin.id, "unmute_user", request, { userId })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error in unmute route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
