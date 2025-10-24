import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
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
    const tickStart = Date.now()

    const [resourceResult, buildingResult, unitResult, movementResult] = await Promise.allSettled([
      processResourceProduction(now),
      processBuildingProduction(now),
      processUnitTraining(now),
      processUnitMovement(now),
    ])

    const tickDuration = Date.now() - tickStart

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      tickDuration: `${tickDuration}ms`,
      message: "Game tick processed successfully",
      results: {
        resources: resourceResult.status === "fulfilled" ? "success" : "failed",
        buildings: buildingResult.status === "fulfilled" ? "success" : "failed",
        units: unitResult.status === "fulfilled" ? "success" : "failed",
        movement: movementResult.status === "fulfilled" ? "success" : "failed",
      },
    })
  } catch (error) {
    console.error("Error in game tick:", error)
    return NextResponse.json({ error: "Failed to process game tick" }, { status: 500 })
  }
}

async function processResourceProduction(now: Date) {
  const fiveSecondsAgo = new Date(now.getTime() - 5 * 1000)
  const supabase = createServiceRoleClient()

  // Get all game states that haven't been updated in the last 5 seconds
  const { data: gameStates } = await supabase
    .from("user_game_states")
    .select("user_id, world_id, last_updated, game_data")
    .lt("last_updated", fiveSecondsAgo.toISOString())

  if (!gameStates || gameStates.length === 0) return

  console.log(`[v0] Processing resources for ${gameStates.length} players`)

  const updates = []

  for (const state of gameStates) {
    try {
      const lastUpdate = new Date(state.last_updated)
      const secondsElapsed = (now.getTime() - lastUpdate.getTime()) / 1000

      // Get production rates from buildings
      const { data: buildings } = await supabase
        .from("buildings")
        .select("building_type, level")
        .eq("user_id", state.user_id)
        .eq("world_id", state.world_id)

      // Calculate production
      const productionRates = { concrete: 10, steel: 10, carbon: 10, fuel: 10 }

      buildings?.forEach((building) => {
        // Apply building bonuses based on type
        if (building.building_type === "factory") {
          productionRates.concrete += 5 * building.level
          productionRates.steel += 5 * building.level
        } else if (building.building_type === "refinery") {
          productionRates.carbon += 5 * building.level
          productionRates.fuel += 5 * building.level
        }
      })

      const currentResources = state.game_data?.resources || { concrete: 0, steel: 0, carbon: 0, fuel: 0 }
      const produced = {
        concrete: Math.floor((productionRates.concrete * secondsElapsed) / 60),
        steel: Math.floor((productionRates.steel * secondsElapsed) / 60),
        carbon: Math.floor((productionRates.carbon * secondsElapsed) / 60),
        fuel: Math.floor((productionRates.fuel * secondsElapsed) / 60),
      }

      const updatedResources = {
        concrete: Math.min(currentResources.concrete + produced.concrete, 100000),
        steel: Math.min(currentResources.steel + produced.steel, 100000),
        carbon: Math.min(currentResources.carbon + produced.carbon, 100000),
        fuel: Math.min(currentResources.fuel + produced.fuel, 100000),
      }

      updates.push({
        user_id: state.user_id,
        world_id: state.world_id,
        game_data: {
          ...state.game_data,
          resources: updatedResources,
        },
        last_updated: now.toISOString(),
      })
    } catch (error) {
      console.error(`Error calculating production for user ${state.user_id}:`, error)
    }
  }

  if (updates.length > 0) {
    for (const update of updates) {
      await supabase
        .from("user_game_states")
        .update({
          game_data: update.game_data,
          last_updated: update.last_updated,
        })
        .eq("user_id", update.user_id)
        .eq("world_id", update.world_id)
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
