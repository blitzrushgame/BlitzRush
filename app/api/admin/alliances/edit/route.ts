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
      return NextResponse.json({ error: "Failed to update alliance" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in admin edit alliance route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
