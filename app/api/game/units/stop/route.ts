import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { unitId } = await request.json()

    if (!unitId) {
      return NextResponse.json({ error: "Missing unit ID" }, { status: 400 })
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

    // Stop the unit at its current position
    const { error: updateError } = await supabase
      .from("units")
      .update({
        is_moving: false,
        target_x: null,
        target_y: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", unitId)

    if (updateError) {
      console.error("Error stopping unit:", updateError)
      return NextResponse.json({ error: "Failed to stop unit" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Error stopping unit:", error)
    return NextResponse.json({ error: "Failed to stop unit" }, { status: 500 })
  }
}
