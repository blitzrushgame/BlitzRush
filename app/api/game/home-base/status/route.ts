import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: homeBase } = await supabase
      .from("buildings")
      .select("*")
      .eq("user_id", userId)
      .eq("is_home_base", true)
      .eq("is_visible", true)
      .maybeSingle()

    // Check if user owns any other bases
    const { count: otherBasesCount } = await supabase
      .from("buildings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_home_base", false)

    const canRelocate = (otherBasesCount || 0) === 0

    return NextResponse.json({
      homeBase: homeBase || null,
      hasHomeBase: !!homeBase,
      canRelocate,
      otherBasesCount: otherBasesCount || 0,
    })
  } catch (error) {
    console.error("[v0] Error fetching home base status:", error)
    return NextResponse.json({ error: "Failed to fetch home base status" }, { status: 500 })
  }
}
