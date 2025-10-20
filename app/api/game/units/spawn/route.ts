import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { UNIT_STATS, type UnitType } from "@/lib/game/unit-constants"

// This route is called by the game tick system to spawn completed units
export async function POST(request: NextRequest) {
  try {
    const { buildingId, unitType, x, y } = await request.json()

    if (!buildingId || !unitType || x === undefined || y === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

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

    // Get building to verify ownership and get world_id
    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .select("world_id, user_id")
      .eq("id", buildingId)
      .eq("user_id", userId)
      .single()

    if (buildingError || !building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 })
    }

    // Get unit stats
    const stats = UNIT_STATS[unitType as UnitType]
    if (!stats) {
      return NextResponse.json({ error: "Invalid unit type" }, { status: 400 })
    }

    // Create the unit
    const { data: unit, error: unitError } = await supabase
      .from("units")
      .insert({
        user_id: userId,
        world_id: building.world_id,
        unit_type: unitType,
        x,
        y,
        health: stats.maxHealth,
        max_health: stats.maxHealth,
        attack: stats.attack,
        defense: stats.defense,
        movement_speed: stats.movementSpeed,
      })
      .select()
      .single()

    if (unitError) {
      console.error("Error spawning unit:", unitError)
      return NextResponse.json({ error: "Failed to spawn unit" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      unit,
    })
  } catch (error) {
    console.error("Error spawning unit:", error)
    return NextResponse.json({ error: "Failed to spawn unit" }, { status: 500 })
  }
}
