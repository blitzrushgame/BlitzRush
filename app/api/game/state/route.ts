import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const getDatabaseConnection = () => {
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL
  if (!dbUrl) {
    console.error("[v0] No database URL found in environment variables")
    return null
  }
  return neon(dbUrl)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userIdParam = searchParams.get("userId")
  const mapIdParam = searchParams.get("mapId")

  const userId = userIdParam ? Number.parseInt(userIdParam, 10) : null
  const mapId = mapIdParam ? Number.parseInt(mapIdParam, 10) : null

  console.log("[v0] GET request - userId:", userId, "mapId:", mapId)

  if (!userId || !mapId || isNaN(userId) || isNaN(mapId)) {
    return NextResponse.json({ error: "Missing or invalid parameters" }, { status: 400 })
  }

  const sql = getDatabaseConnection()
  if (!sql) {
    console.error("[v0] Database connection not available")
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    console.log("[v0] Querying database for user_game_states...")
    const result = await sql`
      SELECT game_data FROM user_game_states
      WHERE user_id = ${userId} AND world_id = ${mapId}
    `

    console.log("[v0] Query result:", result.length, "rows found")

    if (result.length > 0) {
      const gameData = result[0].game_data
      console.log("[v0] Game data type:", typeof gameData)
      console.log("[v0] Returning existing game state")

      // Return the game data directly - it's already a JS object from JSONB
      return NextResponse.json({ state: gameData })
    }

    console.log("[v0] No game state found, returning null")
    return NextResponse.json({ state: null })
  } catch (error) {
    console.error("[v0] Error loading game state:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[v0] Error details:", errorMessage)
    return NextResponse.json(
      {
        error: "Failed to load game state",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const sql = getDatabaseConnection()
  if (!sql) {
    console.error("[v0] Database connection not available")
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { userId: userIdRaw, mapId: mapIdRaw, state } = body

    const userId = typeof userIdRaw === "number" ? userIdRaw : Number.parseInt(String(userIdRaw), 10)
    const mapId = typeof mapIdRaw === "number" ? mapIdRaw : Number.parseInt(String(mapIdRaw), 10)

    if (!userId || !mapId || !state || isNaN(userId) || isNaN(mapId)) {
      return NextResponse.json({ error: "Missing or invalid parameters" }, { status: 400 })
    }

    console.log("[v0] Saving game state for userId:", userId, "mapId:", mapId)

    await sql`
      INSERT INTO user_game_states (user_id, world_id, game_data, last_updated)
      VALUES (${userId}, ${mapId}, ${JSON.stringify(state)}::jsonb, NOW())
      ON CONFLICT (user_id, world_id)
      DO UPDATE SET
        game_data = ${JSON.stringify(state)}::jsonb,
        last_updated = NOW()
    `

    console.log("[v0] Game state saved successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving game state:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[v0] Error details:", errorMessage)
    return NextResponse.json(
      {
        error: "Failed to save game state",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
