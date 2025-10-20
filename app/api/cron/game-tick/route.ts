import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { applyResourceProduction } from "@/lib/game/resource-production"
import { BUILDING_STATS } from "@/lib/game/building-constants"
import { UNIT_STATS } from "@/lib/game/unit-constants"

// This route should be called by a cron job every minute
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()

    // 1. Process resource production for all active players
    await processResourceProduction(now)

    // 2. Process building construction/upgrades
    await processBuildingProduction(now)

    // 3. Process unit training
    await processUnitTraining(now)

    // 4. Update unit movements
    await processUnitMovement(now)

    // 5. Process home base despawn/respawn
    await processHomeBaseDespawn(now)
    await processHomeBaseRespawn(now)

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      message: "Game tick processed successfully",
    })
  } catch (error) {
    console.error("Error in game tick:", error)
    return NextResponse.json({ error: "Failed to process game tick" }, { status: 500 })
  }
}

async function processResourceProduction(now: Date) {
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  const supabase = createServiceRoleClient()

  const { data: gameStates } = await supabase
    .from("user_game_states")
    .select("user_id, world_id, last_played")
    .lt("last_played", oneHourAgo.toISOString())

  if (!gameStates) return

  for (const state of gameStates) {
    try {
      await applyResourceProduction(state.user_id, state.world_id, new Date(state.last_played))
    } catch (error) {
      console.error(`Error applying production for user ${state.user_id}:`, error)
    }
  }
}

async function processBuildingProduction(now: Date) {
  const supabase = createServiceRoleClient()

  const { data: buildings } = await supabase
    .from("buildings")
    .select("*")
    .not("production_queue", "is", null)
    .neq("production_queue", "[]")

  if (!buildings) return

  for (const building of buildings) {
    const queue = building.production_queue || []
    let queueUpdated = false
    const updatedQueue = []

    for (const item of queue) {
      const completesAt = new Date(item.completes_at)

      if (completesAt <= now) {
        if (item.type === "construction") {
          const stats = BUILDING_STATS[building.building_type as keyof typeof BUILDING_STATS]
          await supabase
            .from("buildings")
            .update({ health: stats?.maxHealth || 100 })
            .eq("id", building.id)
        } else if (item.type === "upgrade") {
          await supabase.from("buildings").update({ level: item.target_level }).eq("id", building.id)
        } else if (item.type === "unit") {
          const stats = UNIT_STATS[item.unitType as keyof typeof UNIT_STATS]
          if (stats) {
            await supabase.from("units").insert({
              user_id: building.user_id,
              world_id: building.world_id,
              unit_type: item.unitType,
              x: building.x + 2,
              y: building.y + 2,
              health: stats.maxHealth,
              max_health: stats.maxHealth,
              attack: stats.attack,
              defense: stats.defense,
              movement_speed: stats.movementSpeed,
            })
          }
        }
        queueUpdated = true
      } else {
        updatedQueue.push(item)
      }
    }

    if (queueUpdated) {
      await supabase
        .from("buildings")
        .update({
          production_queue: updatedQueue,
          last_production_tick: now.toISOString(),
        })
        .eq("id", building.id)
    }
  }
}

async function processUnitTraining(now: Date) {
  // Handled in processBuildingProduction
}

async function processUnitMovement(now: Date) {
  const supabase = createServiceRoleClient()

  const { data: movingUnits } = await supabase.from("units").select("*").eq("is_moving", true)

  if (!movingUnits) return

  for (const unit of movingUnits) {
    if (!unit.target_x || !unit.target_y) continue

    const lastUpdate = new Date(unit.updated_at)
    const timeElapsed = (now.getTime() - lastUpdate.getTime()) / 1000

    const distanceToTarget = Math.sqrt(Math.pow(unit.target_x - unit.x, 2) + Math.pow(unit.target_y - unit.y, 2))
    const maxDistance = unit.movement_speed * timeElapsed

    if (maxDistance >= distanceToTarget) {
      await supabase
        .from("units")
        .update({
          x: unit.target_x,
          y: unit.target_y,
          is_moving: false,
          target_x: null,
          target_y: null,
          updated_at: now.toISOString(),
        })
        .eq("id", unit.id)
    } else {
      const progress = maxDistance / distanceToTarget
      const newX = Math.round(unit.x + (unit.target_x - unit.x) * progress)
      const newY = Math.round(unit.y + (unit.target_y - unit.y) * progress)

      await supabase
        .from("units")
        .update({
          x: newX,
          y: newY,
          updated_at: now.toISOString(),
        })
        .eq("id", unit.id)
    }
  }
}

async function processHomeBaseDespawn(now: Date) {
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000)
  const supabase = createServiceRoleClient()

  const { data: result } = await supabase
    .from("buildings")
    .update({ is_visible: false })
    .eq("building_type", "base")
    .eq("is_visible", true)
    .in("user_id", supabase.from("users").select("id").lt("last_activity", twoMinutesAgo.toISOString()) as any)
    .select("id")

  if (result && result.length > 0) {
    console.log(`[v0] Despawned ${result.length} home bases for offline players`)
  }
}

async function processHomeBaseRespawn(now: Date) {
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000)
  const supabase = createServiceRoleClient()

  const { data: invisibleBases } = await supabase
    .from("buildings")
    .select("id, user_id, world_id, users!inner(last_activity)")
    .eq("building_type", "base")
    .eq("is_visible", false)
    .gte("users.last_activity", twoMinutesAgo.toISOString())

  if (!invisibleBases || invisibleBases.length === 0) return

  console.log(`[v0] Respawning ${invisibleBases.length} home bases for returning players`)

  for (const base of invisibleBases) {
    const newX = Math.floor(Math.random() * 8000) + 1000
    const newY = Math.floor(Math.random() * 8000) + 1000

    await supabase
      .from("buildings")
      .update({
        is_visible: true,
        x: newX,
        y: newY,
      })
      .eq("id", base.id)
  }
}
