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
    const { ipAddress, banType, duration, reason } = await request.json()

    if (!ipAddress || !banType || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Calculate ban expiration for temporary bans
    let bannedUntil = null
    if (banType === "temporary" && duration) {
      const now = new Date()
      bannedUntil = new Date(now.getTime() + duration * 60 * 60 * 1000).toISOString()
    }

    // Add IP to banned_ips table
    const { error: insertError } = await supabase.from("banned_ips").upsert(
      {
        ip_address: ipAddress,
        ban_type: banType,
        reason,
        banned_until: bannedUntil,
        banned_at: new Date().toISOString(),
        banned_by_admin_id: admin.id,
      },
      { onConflict: "ip_address" },
    )

    if (insertError) {
      console.error("[v0] Error banning IP:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Log moderation action
    await supabase.from("moderation_log").insert({
      admin_id: admin.id,
      action_type: "ip_ban",
      target_ip: ipAddress,
      reason,
      duration_type: banType,
      duration_until: bannedUntil,
    })

    // Log admin action
    await logAdminAction(admin.id, "ip_ban", request, {
      ipAddress,
      banType,
      duration,
      reason,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error in IP ban route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
