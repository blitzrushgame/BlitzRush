import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUpgradeCost, BUILDING_STATS, type BuildingType } from "@/lib/game/building-constants"
import { deductResources } from "@/lib/game/resource-production"

export async function POST(request: NextRequest) {
  try {
    const { buildingId } = await request.json()

    if (!buildingId) {
      return NextResponse.json({ error: "Missing building ID" }, { status: 400 })
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

    // Get building
    const { data: building, error: fetchError } = await supabase
      .from("buildings")
      .select("*")
      .eq("id", buildingId)
      .eq("user_id", userId)
      .single()

    if (fetchError || !building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 })
    }

    // Check if building is still under construction
    if (building.health === 0) {
      return NextResponse.json({ error: "Building is still under construction" }, { status: 400 })
    }

    // Check if building is already upgrading
    const hasActiveUpgrade = building.production_queue?.some(
      (item: any) => item.type === "upgrade" && new Date(item.completes_at) > new Date(),
    )

    if (hasActiveUpgrade) {
      return NextResponse.json({ error: "Building is already upgrading" }, { status: 400 })
    }

    // Calculate upgrade cost
    const upgradeCost = getUpgradeCost(building.building_type as BuildingType, building.level)

    // Deduct resources
    const success = await deductResources(userId, building.world_id, upgradeCost)
    if (!success) {
      return NextResponse.json({ error: "Insufficient resources" }, { status: 400 })
    }

    // Add upgrade to production queue
    const stats = BUILDING_STATS[building.building_type as BuildingType]
    const upgradeCompleteAt = new Date(Date.now() + stats.constructionTime * 1000 * building.level) // Longer time for higher levels

    const updatedQueue = [
      ...(building.production_queue || []),
      {
        type: "upgrade",
        completes_at: upgradeCompleteAt.toISOString(),
        target_level: building.level + 1,
      },
    ]

    const { error: updateError } = await supabase
      .from("buildings")
      .update({
        production_queue: updatedQueue,
      })
      .eq("id", buildingId)

    if (updateError) {
      console.error("Error upgrading building:", updateError)
      return NextResponse.json({ error: "Failed to upgrade building" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      upgradeCompleteAt,
      targetLevel: building.level + 1,
    })
  } catch (error) {
    console.error("Error upgrading building:", error)
    return NextResponse.json({ error: "Failed to upgrade building" }, { status: 500 })
  }
}
