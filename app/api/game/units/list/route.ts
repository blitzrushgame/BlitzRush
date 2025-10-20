import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
    const supabase = await createClient()

    // Get all units for this user in this world
    const { data: units, error } = await supabase
      .from("units")
      .select("*")
      .eq("user_id", userId)
      .eq("world_id", worldId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching units:", error)
      return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      units,
    })
  } catch (error) {
    console.error("Error listing units:", error)
    return NextResponse.json({ error: "Failed to list units" }, { status: 500 })
  }
}
