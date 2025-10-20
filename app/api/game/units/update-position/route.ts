import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateMovement } from "@/lib/game/movement-utils"

// This route is called by the game tick system to update unit positions
export async function POST(request: NextRequest) {
  try {
    const { unitId, newX, newY } = await request.json()

    if (!unitId || newX === undefined || newY === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get unit
    const { data: unit, error: unitError } = await supabase.from("units").select("*").eq("id", unitId).single()

    if (unitError || !unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 })
    }

    // Validate movement (anti-cheat)
    const timeElapsed = Date.now() - new Date(unit.updated_at).getTime()
    const isValid = validateMovement({ x: unit.x, y: unit.y }, { x: newX, y: newY }, unit.movement_speed, timeElapsed)

    if (!isValid) {
      console.error("Invalid movement detected for unit", unitId)
      return NextResponse.json({ error: "Invalid movement - too fast" }, { status: 400 })
    }

    // Check if unit reached target
    const reachedTarget = unit.target_x === newX && unit.target_y === newY

    // Update unit position
    const { error: updateError } = await supabase
      .from("units")
      .update({
        x: newX,
        y: newY,
        is_moving: !reachedTarget,
        target_x: reachedTarget ? null : unit.target_x,
        target_y: reachedTarget ? null : unit.target_y,
        updated_at: new Date().toISOString(),
      })
      .eq("id", unitId)

    if (updateError) {
      console.error("Error updating unit position:", updateError)
      return NextResponse.json({ error: "Failed to update position" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      reachedTarget,
    })
  } catch (error) {
    console.error("Error updating unit position:", error)
    return NextResponse.json({ error: "Failed to update position" }, { status: 500 })
  }
}
