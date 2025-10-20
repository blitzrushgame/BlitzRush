import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { applyResourceProduction, calculateProductionRates } from "@/lib/game/resource-production"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { worldId } = await request.json()

    // Get user session
    const sessionResponse = await fetch(new URL("/api/auth/session", request.url).toString(), {
      headers: request.headers,
    })
    const sessionData = await sessionResponse.json()

    if (!sessionData.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = sessionData.userId

    // Get last update time
    const { data: gameState, error } = await supabase
      .from("user_game_states")
      .select("last_updated")
      .eq("user_id", userId)
      .eq("world_id", worldId)
      .single()

    if (error || !gameState) {
      return NextResponse.json({ error: "Game state not found" }, { status: 404 })
    }

    // Apply production since last update
    const produced = await applyResourceProduction(userId, worldId, new Date(gameState.last_updated))

    // Get current production rates
    const productionRates = await calculateProductionRates(userId, worldId)

    return NextResponse.json({
      success: true,
      produced,
      productionRates,
    })
  } catch (error) {
    console.error("Error applying resource production:", error)
    return NextResponse.json({ error: "Failed to apply resource production" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const worldId = Number.parseInt(searchParams.get("worldId") || "1")

    // Get user session
    const sessionResponse = await fetch(new URL("/api/auth/session", request.url).toString(), {
      headers: request.headers,
    })
    const sessionData = await sessionResponse.json()

    if (!sessionData.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = sessionData.userId

    // Get current production rates
    const productionRates = await calculateProductionRates(userId, worldId)

    return NextResponse.json({
      success: true,
      productionRates,
    })
  } catch (error) {
    console.error("Error fetching production rates:", error)
    return NextResponse.json({ error: "Failed to fetch production rates" }, { status: 500 })
  }
}
