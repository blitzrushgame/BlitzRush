import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: NextRequest) {
  try {
    const { userId, upgradeType } = await request.json()

    if (!userId || !upgradeType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Get current defenses
    const { data: currentDefenses, error: fetchError } = await supabase
      .from("base_defenses")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const newData: any = {}

    if (upgradeType === "count") {
      // Increase turret count (max 30)
      const currentCount = currentDefenses?.count || 2
      if (currentCount >= 30) {
        return NextResponse.json({ error: "Maximum turret count reached" }, { status: 400 })
      }
      newData.count = currentCount + 1
    } else if (upgradeType === "level") {
      // Upgrade damage tier (max level 4)
      const currentLevel = currentDefenses?.level || 1
      if (currentLevel >= 4) {
        return NextResponse.json({ error: "Maximum level reached" }, { status: 400 })
      }
      newData.level = currentLevel + 1
      newData.damage_multiplier = (currentDefenses?.damage_multiplier || 1.0) * 1.5
    } else {
      return NextResponse.json({ error: "Invalid upgrade type" }, { status: 400 })
    }

    // Get user's home base
    const { data: homeBase } = await supabase
      .from("buildings")
      .select("id")
      .eq("user_id", userId)
      .eq("is_home_base", true)
      .single()

    // Upsert defenses
    if (!currentDefenses) {
      // Create new defense record
      const { data, error } = await supabase
        .from("base_defenses")
        .insert({
          user_id: userId,
          base_id: homeBase?.id,
          defense_type: "missile",
          level: 1,
          count: 2,
          damage_multiplier: 1.0,
          ...newData,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ defenses: data, success: true })
    } else {
      // Update existing defense record
      const { data, error } = await supabase
        .from("base_defenses")
        .update({
          ...newData,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ defenses: data, success: true })
    }
  } catch (error: any) {
    console.error("[v0] Base defenses upgrade error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
