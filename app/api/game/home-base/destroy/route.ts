import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: NextRequest) {
  try {
    const { userId, choice } = await request.json()

    if (!userId || !choice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (choice !== "relocate" && choice !== "reset") {
      return NextResponse.json({ error: 'Invalid choice. Must be "relocate" or "reset"' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Get user's home base
    const { data: homeBase } = await supabase
      .from("buildings")
      .select("*")
      .eq("user_id", userId)
      .eq("is_home_base", true)
      .maybeSingle()

    if (!homeBase) {
      return NextResponse.json({ error: "Home base not found" }, { status: 404 })
    }

    if (choice === "reset") {
      // Reset home base to default stats on current map
      const { data: resetHomeBase, error: updateError } = await supabase
        .from("buildings")
        .update({
          level: 1,
          health: 1000,
          max_health: 1000,
          turret_count: 4,
          factory_level: 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", homeBase.id)
        .select()
        .single()

      if (updateError) {
        console.error("[v0] Error resetting home base:", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        homeBase: resetHomeBase,
        message: "Home base reset to default stats",
      })
    } else {
      return NextResponse.json({
        homeBase: homeBase,
        message: "Ready to relocate. Choose a new location on the newest map.",
      })
    }
  } catch (error) {
    console.error("[v0] Error handling home base destruction:", error)
    return NextResponse.json({ error: "Failed to handle home base destruction" }, { status: 500 })
  }
}
