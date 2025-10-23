import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { WORLD_SIZE_TILES, CAMERA_VIEWING_RADIUS_TILES } from "@/lib/game/constants"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] Create home base request body:", body)

    const { userId, worldId } = body
    let { x, y } = body

    if (!userId || !worldId) {
      console.log("[v0] Missing required fields:", { userId, worldId })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Checking for existing home base for user:", userId)

    const supabase = createServiceRoleClient()

    // Check if user already has a home base
    const { data: existingHomeBase } = await supabase
      .from("buildings")
      .select("id")
      .eq("user_id", userId)
      .eq("is_home_base", true)
      .maybeSingle()

    console.log("[v0] Existing home base check result:", existingHomeBase)

    if (existingHomeBase) {
      return NextResponse.json({ error: "User already has a home base" }, { status: 400 })
    }

    if (x === undefined || y === undefined) {
      const centerTile = WORLD_SIZE_TILES / 2 // 1000
      const spawnRadius = CAMERA_VIEWING_RADIUS_TILES // 15 tiles
      x = Math.floor(centerTile + (Math.random() * spawnRadius * 2 - spawnRadius))
      y = Math.floor(centerTile + (Math.random() * spawnRadius * 2 - spawnRadius))
      console.log("[v0] Generated random tile position:", { x, y })
    }

    console.log("[v0] Inserting home base with tile coords:", { userId, worldId, x, y })

    const { data: homeBase, error: insertError } = await supabase
      .from("buildings")
      .insert({
        user_id: userId,
        world_id: worldId,
        x,
        y,
        building_type: "base",
        is_home_base: true,
        is_visible: true,
        level: 1,
        health: 1000,
        max_health: 1000,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error creating home base:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log("[v0] Home base created successfully:", homeBase)
    return NextResponse.json({ homeBase })
  } catch (error) {
    console.error("[v0] Error creating home base:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        error: "Failed to create home base",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
