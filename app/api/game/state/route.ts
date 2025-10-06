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
  const userId = searchParams.get("userId")
  const mapId = searchParams.get("mapId")

  console.log("[v0] GET request - userId:", userId, "mapId:", mapId)

  if (!userId || !mapId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
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
      console.log("[v0] Returning existing game state")
      return NextResponse.json({ state: result[0].game_data })
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
    const { userId, mapId, state } = await request.json()

    if (!userId || !mapId || !state) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    await sql`
      INSERT INTO user_game_states (user_id, world_id, game_data, last_played)
      VALUES (${userId}, ${mapId}, ${JSON.stringify(state)}, NOW())
      ON CONFLICT (user_id, world_id)
      DO UPDATE SET
        game_data = ${JSON.stringify(state)},
        last_played = NOW()
    `

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
