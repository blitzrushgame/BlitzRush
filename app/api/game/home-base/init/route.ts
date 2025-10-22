import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { WORLD_SIZE_TILES, CAMERA_VIEWING_RADIUS_TILES } from "@/lib/game/constants"

export async function POST(request: Request) {
  try {
    const { userId, username } = await request.json()

    console.log("[v0] Initializing home base for user:", userId)

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Check if user already has a home base
    const { data: existing } = await supabase
      .from("buildings")
      .select("id, x, y")
      .eq("user_id", userId)
      .eq("world_id", 1)
      .eq("building_type", "base")
      .eq("is_home_base", true)
      .maybeSingle()

    if (existing) {
      console.log("[v0] User already has home base at:", existing)
      return NextResponse.json({
        success: true,
        homeBase: existing,
        message: "Home base already exists",
      })
    }

    const centerTile = WORLD_SIZE_TILES / 2 // 1000
    const spawnRadius = CAMERA_VIEWING_RADIUS_TILES // 15 tiles
    const x = Math.floor(centerTile + (Math.random() * spawnRadius * 2 - spawnRadius))
    const y = Math.floor(centerTile + (Math.random() * spawnRadius * 2 - spawnRadius))

    console.log("[v0] Creating new home base at tile coords:", { x, y })

    // Create new home base
    const { data: result, error: insertError } = await supabase
      .from("buildings")
      .insert({
        user_id: userId,
        world_id: 1,
        building_type: "base",
        x,
        y,
        level: 1,
        health: 1000,
        max_health: 1000,
        is_visible: true,
        is_home_base: true,
      })
      .select("id, x, y")
      .single()

    if (insertError) {
      console.error("[v0] Error creating home base:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log("[v0] Home base created successfully:", result)

    return NextResponse.json({
      success: true,
      homeBase: result,
    })
  } catch (error) {
    console.error("[v0] Error initializing home base:", error)
    return NextResponse.json(
      {
        error: "Failed to initialize home base",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
