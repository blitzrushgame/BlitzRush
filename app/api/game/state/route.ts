import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userIdParam = searchParams.get("userId")
  const mapIdParam = searchParams.get("mapId")

  const userId = userIdParam ? Number.parseInt(userIdParam, 10) : null
  const mapId = mapIdParam ? Number.parseInt(mapIdParam, 10) : null

  if (!userId || !mapId || isNaN(userId) || isNaN(mapId)) {
    return NextResponse.json({ error: "Missing or invalid parameters" }, { status: 400 })
  }

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("user_game_states")
      .select("game_data")
      .eq("user_id", userId)
      .eq("world_id", mapId)
      .maybeSingle()

    if (error) {
      console.error("[v0] Database error:", error)
      throw error
    }

    if (data) {
      return NextResponse.json({ state: data.game_data })
    }

    return NextResponse.json({ state: null })
  } catch (error) {
    console.error("[v0] Error loading game state:", error)

    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
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
  try {
    const body = await request.json()
    const { userId: userIdRaw, mapId: mapIdRaw, state } = body

    const userId = typeof userIdRaw === "number" ? userIdRaw : Number.parseInt(String(userIdRaw), 10)
    const mapId = typeof mapIdRaw === "number" ? mapIdRaw : Number.parseInt(String(mapIdRaw), 10)

    if (!userId || !mapId || !state || isNaN(userId) || isNaN(mapId)) {
      return NextResponse.json({ error: "Missing or invalid parameters" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const { error } = await supabase.from("user_game_states").upsert(
      {
        user_id: userId,
        world_id: mapId,
        game_data: state,
        last_played: new Date().toISOString(),
      },
      {
        onConflict: "user_id,world_id",
      },
    )

    if (error) {
      console.error("[v0] Database error:", error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving game state:", error)

    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        error: "Failed to save game state",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
