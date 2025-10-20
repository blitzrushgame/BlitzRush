import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const worldId = Number.parseInt(searchParams.get("worldId") || "1")

    // Get user session
    const sessionResponse = await fetch(new URL("/api/auth/session", request.url).toString(), {
      headers: request.headers,
    })
    const sessionData = await sessionResponse.json()

    if (!sessionData.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = sessionData.userId

    const supabase = await createClient()

    const { data: buildings, error } = await supabase
      .from("buildings")
      .select("*")
      .eq("user_id", userId)
      .eq("world_id", worldId)
      .eq("is_visible", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error listing buildings:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Process buildings to check construction/upgrade status
    const now = new Date()
    const processedBuildings = (buildings || []).map((building) => {
      const queue = building.production_queue || []
      const activeItem = queue.find((item: any) => new Date(item.completes_at) > now)

      return {
        ...building,
        isUnderConstruction: building.health === 0,
        isUpgrading: activeItem?.type === "upgrade",
        activeProduction: activeItem || null,
      }
    })

    return NextResponse.json({
      success: true,
      buildings: processedBuildings,
    })
  } catch (error) {
    console.error("Error listing buildings:", error)
    return NextResponse.json({ error: "Failed to list buildings" }, { status: 500 })
  }
}
