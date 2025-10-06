import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get("admin_authenticated")?.value === "true"

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Get all alliances with member count
    const { data: alliances, error } = await supabase
      .from("alliances")
      .select(
        `
        *,
        alliance_members (
          id,
          user_id,
          role,
          joined_at,
          users (
            id,
            username
          )
        )
      `,
      )
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching alliances:", error)
      return NextResponse.json({ error: "Failed to fetch alliances" }, { status: 500 })
    }

    return NextResponse.json({ alliances })
  } catch (error) {
    console.error("[v0] Error in admin alliances route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
