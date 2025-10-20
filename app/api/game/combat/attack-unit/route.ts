import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isInAttackRange, simulateCombat } from "@/lib/game/combat-utils"

export async function POST(request: NextRequest) {
  try {
    const { attackerUnitId, defenderUnitId } = await request.json()

    if (!attackerUnitId || !defenderUnitId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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

    // Get both units
    const { data: attacker, error: attackerError } = await supabase
      .from("units")
      .select("*")
      .eq("id", attackerUnitId)
      .eq("user_id", userId)
      .single()

    if (attackerError || !attacker) {
      return NextResponse.json({ error: "Attacker unit not found" }, { status: 404 })
    }

    const { data: defender, error: defenderError } = await supabase
      .from("units")
      .select("*")
      .eq("id", defenderUnitId)
      .single()

    if (defenderError || !defender) {
      return NextResponse.json({ error: "Defender unit not found" }, { status: 404 })
    }

    // Prevent attacking own units
    if (defender.user_id === userId) {
      return NextResponse.json({ error: "Cannot attack your own units" }, { status: 400 })
    }

    // Check if units are in the same world
    if (attacker.world_id !== defender.world_id) {
      return NextResponse.json({ error: "Units are not in the same world" }, { status: 400 })
    }

    // Check if attacker is in range
    if (!isInAttackRange({ x: attacker.x, y: attacker.y }, { x: defender.x, y: defender.y })) {
      return NextResponse.json({ error: "Target is out of range" }, { status: 400 })
    }

    // Simulate combat
    const result = simulateCombat(
      {
        attack: attacker.attack,
        defense: attacker.defense,
        health: attacker.health,
        maxHealth: attacker.max_health,
      },
      {
        attack: defender.attack,
        defense: defender.defense,
        health: defender.health,
        maxHealth: defender.max_health,
      },
    )

    // Update attacker health
    if (result.attackerDied) {
      await supabase.from("units").delete().eq("id", attackerUnitId)
    } else {
      await supabase
        .from("units")
        .update({
          health: result.attackerNewHealth,
          updated_at: new Date().toISOString(),
        })
        .eq("id", attackerUnitId)
    }

    // Update defender health
    if (result.defenderDied) {
      await supabase.from("units").delete().eq("id", defenderUnitId)
    } else {
      await supabase
        .from("units")
        .update({
          health: result.defenderNewHealth,
          updated_at: new Date().toISOString(),
        })
        .eq("id", defenderUnitId)
    }

    // Log combat
    await supabase.from("combat_logs").insert({
      world_id: attacker.world_id,
      attacker_id: userId,
      defender_id: defender.user_id,
      result: {
        type: "unit_vs_unit",
        attackerUnitId,
        defenderUnitId,
        attackerDamage: result.attackerDamage,
        defenderDamage: result.defenderDamage,
        attackerDied: result.attackerDied,
        defenderDied: result.defenderDied,
      },
    })

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error("Error in combat:", error)
    return NextResponse.json({ error: "Failed to process combat" }, { status: 500 })
  }
}
