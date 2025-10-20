import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { UNIT_COSTS, UNIT_STATS, type UnitType } from "@/lib/game/unit-constants"
import { deductResources } from "@/lib/game/resource-production"

export async function POST(request: NextRequest) {
  try {
    const { worldId, unitType, buildingId } = await request.json()

    // Validate input
    if (!worldId || !unitType || !buildingId) {
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

    // Validate unit type
    const stats = UNIT_STATS[unitType as UnitType]
    if (!stats) {
      return NextResponse.json({ error: "Invalid unit type" }, { status: 400 })
    }

    // Get building and verify ownership
    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .select("*")
      .eq("id", buildingId)
      .eq("user_id", userId)
      .eq("world_id", worldId)
      .single()

    if (buildingError || !building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 })
    }

    // Verify building type can train this unit
    if (building.building_type !== stats.requiredBuilding) {
      return NextResponse.json({ error: `This unit requires a ${stats.requiredBuilding} to train` }, { status: 400 })
    }

    // Check if building is still under construction
    if (building.health === 0) {
      return NextResponse.json({ error: "Building is still under construction" }, { status: 400 })
    }

    // Get unit cost
    const cost = UNIT_COSTS[unitType as UnitType]
    if (!cost) {
      return NextResponse.json({ error: "Unit cost not defined" }, { status: 400 })
    }

    // Deduct resources
    const success = await deductResources(userId, worldId, cost)
    if (!success) {
      return NextResponse.json({ error: "Insufficient resources" }, { status: 400 })
    }

    // Add unit to building's production queue
    const trainingCompleteAt = new Date(Date.now() + stats.trainingTime * 1000)

    const updatedQueue = [
      ...(building.production_queue || []),
      {
        type: "unit",
        unitType,
        completes_at: trainingCompleteAt.toISOString(),
      },
    ]

    const { error: updateError } = await supabase
      .from("buildings")
      .update({
        production_queue: updatedQueue,
        last_production_tick: new Date().toISOString(),
      })
      .eq("id", buildingId)

    if (updateError) {
      console.error("Error adding unit to queue:", updateError)
      return NextResponse.json({ error: "Failed to train unit" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      trainingCompleteAt,
      unitType,
    })
  } catch (error) {
    console.error("Error training unit:", error)
    return NextResponse.json({ error: "Failed to train unit" }, { status: 500 })
  }
}
