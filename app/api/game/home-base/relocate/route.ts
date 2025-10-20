import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: NextRequest) {
  try {
    const { userId, newWorldId, x, y } = await request.json()

    if (!userId || !newWorldId || x === undefined || y === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Check if user owns any other bases (non-home bases)
    const { data: otherBases } = await supabase
      .from("buildings")
      .select("id")
      .eq("user_id", userId)
      .eq("is_home_base", false)

    if (otherBases && otherBases.length > 0) {
      return NextResponse.json(
        { error: "Cannot relocate home base while owning other bases. Abandon all conquered bases first." },
        { status: 400 },
      )
    }

    // Get user's home base
    const { data: homeBase } = await supabase
      .from("buildings")
      .select("*")
      .eq("user_id", userId)
      .eq("is_home_base", true)
      .maybeSingle()

    if (!homeBase) {
      return NextResponse.json({ error: "Home base not found" }, { status: 404 })
    }

    // Update home base location
    const { data: updatedHomeBase, error: updateError } = await supabase
      .from("buildings")
      .update({
        world_id: newWorldId,
        x,
        y,
        updated_at: new Date().toISOString(),
      })
      .eq("id", homeBase.id)
      .select()
      .single()

    if (updateError) {
      console.error("[v0] Error updating home base:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Initialize resources for new world if they don't exist
    const resourceTypes = ["concrete", "steel", "carbon", "fuel"]
    for (const resourceType of resourceTypes) {
      await supabase.from("resources").insert({
        user_id: userId,
        world_id: newWorldId,
        resource_type: resourceType,
        amount: 1000,
        production_rate: 10,
        storage_capacity: 10000,
      })
      // Ignore conflicts (resource already exists)
    }

    return NextResponse.json({ homeBase: updatedHomeBase })
  } catch (error) {
    console.error("[v0] Error relocating home base:", error)
    return NextResponse.json({ error: "Failed to relocate home base" }, { status: 500 })
  }
}
