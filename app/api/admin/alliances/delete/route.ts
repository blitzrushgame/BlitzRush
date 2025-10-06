import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get("admin_authenticated")?.value === "true"

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { allianceId } = await request.json()

    if (!allianceId) {
      return NextResponse.json({ error: "Alliance ID is required" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Delete all related data
    await supabase.from("alliance_members").delete().eq("alliance_id", allianceId)
    await supabase.from("alliance_join_requests").delete().eq("alliance_id", allianceId)
    await supabase.from("alliance_invites").delete().eq("alliance_id", allianceId)

    // Delete the alliance
    const { error } = await supabase.from("alliances").delete().eq("id", allianceId)

    if (error) {
      console.error("[v0] Error deleting alliance:", error)
      return NextResponse.json({ error: "Failed to delete alliance" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in admin delete alliance route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
