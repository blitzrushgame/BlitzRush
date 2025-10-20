import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { BUILDING_COSTS, BUILDING_STATS, type BuildingType } from "@/lib/game/building-constants"
import { deductResources } from "@/lib/game/resource-production"

export async function POST(request: NextRequest) {
  try {
    const { worldId, buildingType, x, y } = await request.json()

    // Validate input
    if (!worldId || !buildingType || x === undefined || y === undefined) {
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

    // Validate building type
    const stats = BUILDING_STATS[buildingType as BuildingType]
    if (!stats) {
      return NextResponse.json({ error: "Invalid building type" }, { status: 400 })
    }

    // Check if position is already occupied
    const { data: existingBuildings } = await supabase
      .from("buildings")
      .select("id, x, y, building_type")
      .eq("world_id", worldId)
      .gte("x", x - 2) // Check nearby area
      .lte("x", x + 2)
      .gte("y", y - 2)
      .lte("y", y + 2)

    // Simple collision check (can be improved with actual size calculations)
    const hasCollision = existingBuildings?.some((building) => {
      const distance = Math.sqrt(Math.pow(building.x - x, 2) + Math.pow(building.y - y, 2))
      return distance < 3 // Minimum distance between buildings
    })

    if (hasCollision) {
      return NextResponse.json({ error: "Position is occupied or too close to another building" }, { status: 400 })
    }

    // Get building cost
    const cost = BUILDING_COSTS[buildingType as BuildingType]
    if (!cost) {
      return NextResponse.json({ error: "Building cost not defined" }, { status: 400 })
    }

    // Deduct resources
    const success = await deductResources(userId, worldId, cost)
    if (!success) {
      return NextResponse.json({ error: "Insufficient resources" }, { status: 400 })
    }

    // Create building with construction timer
    const constructionCompleteAt = new Date(Date.now() + stats.constructionTime * 1000)

    const { data: building, error: buildError } = await supabase
      .from("buildings")
      .insert({
        user_id: userId,
        world_id: worldId,
        building_type: buildingType,
        x,
        y,
        level: 1,
        health: 0, // Building starts with 0 health until construction completes
        max_health: stats.maxHealth,
        production_queue: [
          {
            type: "construction",
            completes_at: constructionCompleteAt.toISOString(),
          },
        ],
      })
      .select()
      .single()

    if (buildError) {
      console.error("Error creating building:", buildError)
      return NextResponse.json({ error: "Failed to create building" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      building,
      constructionCompleteAt,
    })
  } catch (error) {
    console.error("Error constructing building:", error)
    return NextResponse.json({ error: "Failed to construct building" }, { status: 500 })
  }
}
