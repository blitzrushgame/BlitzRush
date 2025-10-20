import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const worldId = Number.parseInt(searchParams.get("worldId") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

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

    // Get combat logs where user was involved
    const { data: logs, error } = await supabase
      .from("combat_logs")
      .select("*")
      .eq("world_id", worldId)
      .or(`attacker_id.eq.${userId},defender_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching combat logs:", error)
      return NextResponse.json({ error: "Failed to fetch combat logs" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      logs,
    })
  } catch (error) {
    console.error("Error fetching combat logs:", error)
    return NextResponse.json({ error: "Failed to fetch combat logs" }, { status: 500 })
  }
}
