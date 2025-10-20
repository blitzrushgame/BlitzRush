import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isInAttackRange, simulateUnitVsBuilding } from "@/lib/game/combat-utils"

export async function POST(request: NextRequest) {
  try {
    const { attackerUnitId, targetBuildingId } = await request.json()

    if (!attackerUnitId || !targetBuildingId) {
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

    // Get attacker unit
    const { data: attacker, error: attackerError } = await supabase
      .from("units")
      .select("*")
      .eq("id", attackerUnitId)
      .eq("user_id", userId)
      .single()

    if (attackerError || !attacker) {
      return NextResponse.json({ error: "Attacker unit not found" }, { status: 404 })
    }

    // Get target building
    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .select("*")
      .eq("id", targetBuildingId)
      .single()

    if (buildingError || !building) {
      return NextResponse.json({ error: "Target building not found" }, { status: 404 })
    }

    // Prevent attacking own buildings
    if (building.user_id === userId) {
      return NextResponse.json({ error: "Cannot attack your own buildings" }, { status: 400 })
    }

    // Check if units are in the same world
    if (attacker.world_id !== building.world_id) {
      return NextResponse.json({ error: "Unit and building are not in the same world" }, { status: 400 })
    }

    // Check if attacker is in range
    if (!isInAttackRange({ x: attacker.x, y: attacker.y }, { x: building.x, y: building.y })) {
      return NextResponse.json({ error: "Target is out of range" }, { status: 400 })
    }

    // Simulate combat
    const result = simulateUnitVsBuilding(
      {
        attack: attacker.attack,
        health: attacker.health,
      },
      {
        defense: 20, // Buildings have fixed defense
        health: building.health,
      },
    )

    // Update building health
    if (result.buildingDestroyed) {
      await supabase.from("buildings").delete().eq("id", targetBuildingId)
    } else {
      await supabase
        .from("buildings")
        .update({
          health: result.buildingNewHealth,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetBuildingId)
    }

    // Log combat
    await supabase.from("combat_logs").insert({
      world_id: attacker.world_id,
      attacker_id: userId,
      defender_id: building.user_id,
      result: {
        type: "unit_vs_building",
        attackerUnitId,
        targetBuildingId,
        damage: result.damage,
        buildingDestroyed: result.buildingDestroyed,
      },
    })

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error("Error in combat:", error)
    return NextResponse.json({ error: "Failed to process combat" }, { status: 500 })
  }
}
