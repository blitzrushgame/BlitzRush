import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  calculateDistance,
  calculateMovementTime,
  isWithinBounds,
  checkCollisionWithBuildings,
} from "@/lib/game/movement-utils"

export async function POST(request: NextRequest) {
  try {
    const { unitId, targetX, targetY } = await request.json()

    // Validate input
    if (!unitId || targetX === undefined || targetY === undefined) {
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

    // Get unit and verify ownership
    const { data: unit, error: unitError } = await supabase
      .from("units")
      .select("*")
      .eq("id", unitId)
      .eq("user_id", userId)
      .single()

    if (unitError || !unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 })
    }

    // Validate target position is within bounds
    if (!isWithinBounds({ x: targetX, y: targetY })) {
      return NextResponse.json({ error: "Target position is out of bounds" }, { status: 400 })
    }

    // Check for collision with buildings
    const hasCollision = await checkCollisionWithBuildings({ x: targetX, y: targetY }, unit.world_id, supabase)

    if (hasCollision) {
      return NextResponse.json({ error: "Cannot move to this position - blocked by building" }, { status: 400 })
    }

    // Calculate movement time
    const distance = calculateDistance({ x: unit.x, y: unit.y }, { x: targetX, y: targetY })
    const movementTime = calculateMovementTime(distance, unit.movement_speed)
    const arrivalTime = new Date(Date.now() + movementTime)

    // Update unit with movement target
    const { error: updateError } = await supabase
      .from("units")
      .update({
        is_moving: true,
        target_x: targetX,
        target_y: targetY,
        updated_at: new Date().toISOString(),
      })
      .eq("id", unitId)

    if (updateError) {
      console.error("Error updating unit movement:", updateError)
      return NextResponse.json({ error: "Failed to move unit" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      arrivalTime: arrivalTime.toISOString(),
      distance,
      movementTime,
    })
  } catch (error) {
    console.error("Error moving unit:", error)
    return NextResponse.json({ error: "Failed to move unit" }, { status: 500 })
  }
}
