import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  try {
    const { userId, username } = await request.json()

    console.log("[v0] Initializing home base for user:", userId)

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: existingUser } = await supabase.from("users").select("id").eq("id", userId).maybeSingle()

    if (!existingUser) {
      console.log("[v0] User not found in database, creating user record")
      const { error: userError } = await supabase.from("users").insert({
        id: userId,
        username: username || `Player${userId}`,
        password: "supabase_auth",
        ip_address: "0.0.0.0",
      })

      if (userError) {
        console.error("[v0] Error creating user:", userError)
        return NextResponse.json({ error: userError.message }, { status: 500 })
      }
      console.log("[v0] User record created successfully")
    }

    // Check if user already has a home base
    const { data: existing } = await supabase
      .from("buildings")
      .select("id, x, y")
      .eq("user_id", userId)
      .eq("world_id", 1)
      .eq("building_type", "base")
      .eq("is_home_base", true)
      .maybeSingle()

    if (existing) {
      console.log("[v0] User already has home base at:", existing)
      return NextResponse.json({
        success: true,
        homeBase: existing,
        message: "Home base already exists",
      })
    }

    // Generate random position for new home base
    const x = Math.floor(Math.random() * 8000) + 1000
    const y = Math.floor(Math.random() * 8000) + 1000

    console.log("[v0] Creating new home base at:", { x, y })

    // Create new home base
    const { data: result, error: insertError } = await supabase
      .from("buildings")
      .insert({
        user_id: userId,
        world_id: 1,
        building_type: "base",
        x,
        y,
        level: 1,
        health: 1000,
        max_health: 1000,
        is_visible: true,
        is_home_base: true,
      })
      .select("id, x, y")
      .single()

    if (insertError) {
      console.error("[v0] Error creating home base:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log("[v0] Home base created successfully:", result)

    return NextResponse.json({
      success: true,
      homeBase: result,
    })
  } catch (error) {
    console.error("[v0] Error initializing home base:", error)
    return NextResponse.json(
      {
        error: "Failed to initialize home base",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
