import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Get user's base defenses
    const { data: defenses, error } = await supabase.from("base_defenses").select("*").eq("user_id", userId).single()

    if (error && error.code !== "PGRST116") {
      console.error("[v0] Error fetching base defenses:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no defenses exist, return default values
    if (!defenses) {
      return NextResponse.json({
        defenses: {
          defense_type: "missile",
          level: 1,
          count: 2,
          damage_multiplier: 1.0,
        },
        exists: false,
      })
    }

    return NextResponse.json({
      defenses,
      exists: true,
    })
  } catch (error: any) {
    console.error("[v0] Base defenses status error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
