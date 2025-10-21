import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { calculateProductionRates } from "@/lib/game/resource-production"
import { STORAGE_CAPACITY } from "@/lib/game/resource-constants"

export async function POST(request: NextRequest) {
  try {
    const { userId, worldId } = await request.json()

    if (!userId || !worldId) {
      return NextResponse.json({ error: "Missing userId or worldId" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current game state
    const { data: gameState, error: stateError } = await supabase
      .from("user_game_states")
      .select("game_data, last_updated")
      .eq("user_id", userId)
      .eq("world_id", worldId)
      .single()

    if (stateError || !gameState) {
      return NextResponse.json({ error: "Game state not found" }, { status: 404 })
    }

    const now = new Date()
    const lastUpdate = new Date(gameState.last_updated)
    const secondsElapsed = (now.getTime() - lastUpdate.getTime()) / 1000

    if (secondsElapsed < 5) {
      return NextResponse.json(
        {
          error: "Too soon",
          message: "Resources can only be generated every 5 seconds",
          secondsRemaining: Math.ceil(5 - secondsElapsed),
        },
        { status: 429 },
      )
    }

    // Calculate production rates based on buildings
    const productionRates = await calculateProductionRates(userId, worldId)

    // Calculate resources produced (rates are per hour, convert to per second)
    const hoursElapsed = secondsElapsed / 3600
    const currentResources = gameState.game_data.resources || {
      concrete: 0,
      steel: 0,
      carbon: 0,
      fuel: 0,
    }

    const produced = {
      concrete: Math.floor(productionRates.concrete * hoursElapsed),
      steel: Math.floor(productionRates.steel * hoursElapsed),
      carbon: Math.floor(productionRates.carbon * hoursElapsed),
      fuel: Math.floor(productionRates.fuel * hoursElapsed),
    }

    // Apply storage caps
    const updatedResources = {
      concrete: Math.min(currentResources.concrete + produced.concrete, STORAGE_CAPACITY.concrete),
      steel: Math.min(currentResources.steel + produced.steel, STORAGE_CAPACITY.steel),
      carbon: Math.min(currentResources.carbon + produced.carbon, STORAGE_CAPACITY.carbon),
      fuel: Math.min(currentResources.fuel + produced.fuel, STORAGE_CAPACITY.fuel),
    }

    // Update game state with new resources and timestamp
    const { error: updateError } = await supabase
      .from("user_game_states")
      .update({
        game_data: {
          ...gameState.game_data,
          resources: updatedResources,
        },
        last_updated: now.toISOString(),
      })
      .eq("user_id", userId)
      .eq("world_id", worldId)

    if (updateError) {
      console.error("[v0] Error updating resources:", updateError)
      return NextResponse.json({ error: "Failed to update resources" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      resources: updatedResources,
      produced,
      productionRates,
      secondsElapsed: Math.floor(secondsElapsed),
    })
  } catch (error) {
    console.error("[v0] Error generating resources:", error)
    return NextResponse.json({ error: "Failed to generate resources" }, { status: 500 })
  }
}
