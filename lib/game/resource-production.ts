import { createClient } from "@/lib/supabase/server"
import {
  BASE_PRODUCTION_RATES,
  STORAGE_CAPACITY,
  BUILDING_PRODUCTION_BONUS,
  type ResourceType,
} from "./resource-constants"

export interface ResourceProduction {
  concrete: number
  steel: number
  carbon: number
  fuel: number
}

/**
 * Calculate resource production based on buildings owned
 */
export async function calculateProductionRates(userId: number, worldId: number): Promise<ResourceProduction> {
  const supabase = await createClient()

  // Get all buildings for this user in this world
  const { data: buildings, error } = await supabase
    .from("buildings")
    .select("building_type, level")
    .eq("user_id", userId)
    .eq("world_id", worldId)

  if (error) {
    console.error("Error fetching buildings:", error)
    return { ...BASE_PRODUCTION_RATES }
  }

  // Start with base production rates
  const production: ResourceProduction = { ...BASE_PRODUCTION_RATES }

  // Apply building bonuses
  buildings?.forEach((building) => {
    const bonus = BUILDING_PRODUCTION_BONUS[building.building_type as keyof typeof BUILDING_PRODUCTION_BONUS]
    if (bonus) {
      Object.entries(bonus).forEach(([resource, multiplier]) => {
        production[resource as ResourceType] *= multiplier * building.level
      })
    }
  })

  return production
}

/**
 * Apply resource production based on time elapsed
 */
export async function applyResourceProduction(
  userId: number,
  worldId: number,
  lastUpdateTime: Date,
): Promise<ResourceProduction> {
  const supabase = await createClient()

  // Calculate time elapsed in hours
  const now = new Date()
  const hoursElapsed = (now.getTime() - lastUpdateTime.getTime()) / (1000 * 60 * 60)

  // Get current production rates
  const productionRates = await calculateProductionRates(userId, worldId)

  // Calculate resources produced
  const produced: ResourceProduction = {
    concrete: Math.floor(productionRates.concrete * hoursElapsed),
    steel: Math.floor(productionRates.steel * hoursElapsed),
    carbon: Math.floor(productionRates.carbon * hoursElapsed),
    fuel: Math.floor(productionRates.fuel * hoursElapsed),
  }

  // Get current game state
  const { data: gameState, error: stateError } = await supabase
    .from("user_game_states")
    .select("game_data")
    .eq("user_id", userId)
    .eq("world_id", worldId)
    .single()

  if (stateError || !gameState) {
    console.error("Error fetching game state:", stateError)
    return produced
  }

  // Update resources with storage caps
  const currentResources = gameState.game_data.resources || {}
  const updatedResources = {
    concrete: Math.min((currentResources.concrete || 0) + produced.concrete, STORAGE_CAPACITY.concrete),
    steel: Math.min((currentResources.steel || 0) + produced.steel, STORAGE_CAPACITY.steel),
    carbon: Math.min((currentResources.carbon || 0) + produced.carbon, STORAGE_CAPACITY.carbon),
    fuel: Math.min((currentResources.fuel || 0) + produced.fuel, STORAGE_CAPACITY.fuel),
  }

  // Update game state with new resources
  const { error: updateError } = await supabase
    .from("user_game_states")
    .update({
      game_data: {
        ...gameState.game_data,
        resources: updatedResources,
      },
      last_updated: now.toISOString(),
    })
    .eq("user_id", userId)
    .eq("world_id", worldId)

  if (updateError) {
    console.error("Error updating resources:", updateError)
  }

  return produced
}

/**
 * Check if user has enough resources for a cost
 */
export function hasEnoughResources(currentResources: ResourceProduction, cost: Partial<ResourceProduction>): boolean {
  return Object.entries(cost).every(([resource, amount]) => currentResources[resource as ResourceType] >= amount)
}

/**
 * Deduct resources from user's game state
 */
export async function deductResources(
  userId: number,
  worldId: number,
  cost: Partial<ResourceProduction>,
): Promise<boolean> {
  const supabase = await createClient()

  // Get current game state
  const { data: gameState, error: stateError } = await supabase
    .from("user_game_states")
    .select("game_data")
    .eq("user_id", userId)
    .eq("world_id", worldId)
    .single()

  if (stateError || !gameState) {
    return false
  }

  const currentResources = gameState.game_data.resources || {}

  // Check if user has enough resources
  if (!hasEnoughResources(currentResources, cost)) {
    return false
  }

  // Deduct resources
  const updatedResources = { ...currentResources }
  Object.entries(cost).forEach(([resource, amount]) => {
    updatedResources[resource as ResourceType] -= amount
  })

  // Update game state
  const { error: updateError } = await supabase
    .from("user_game_states")
    .update({
      game_data: {
        ...gameState.game_data,
        resources: updatedResources,
      },
    })
    .eq("user_id", userId)
    .eq("world_id", worldId)

  return !updateError
}
