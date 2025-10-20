import type { ResourceProduction } from "./resource-production"

export const BUILDING_TYPES = {
  BASE: "base",
  BARRACKS: "barracks",
  FACTORY: "factory",
  MINE: "mine",
  DEFENSE_TOWER: "defense_tower",
  REFINERY: "refinery",
  POWER_PLANT: "power_plant",
} as const

export type BuildingType = (typeof BUILDING_TYPES)[keyof typeof BUILDING_TYPES]

export interface BuildingStats {
  maxHealth: number
  constructionTime: number // in seconds
  size: { width: number; height: number } // grid size
  description: string
}

// Building statistics by type
export const BUILDING_STATS: Record<BuildingType, BuildingStats> = {
  base: {
    maxHealth: 500,
    constructionTime: 120, // 2 minutes
    size: { width: 3, height: 3 },
    description: "Main command center. Produces resources and allows construction.",
  },
  barracks: {
    maxHealth: 300,
    constructionTime: 60, // 1 minute
    size: { width: 2, height: 2 },
    description: "Trains infantry units.",
  },
  factory: {
    maxHealth: 350,
    constructionTime: 90, // 1.5 minutes
    size: { width: 3, height: 2 },
    description: "Produces vehicles and heavy units. Boosts steel and carbon production.",
  },
  mine: {
    maxHealth: 250,
    constructionTime: 45, // 45 seconds
    size: { width: 2, height: 2 },
    description: "Extracts resources. Boosts concrete and steel production.",
  },
  defense_tower: {
    maxHealth: 400,
    constructionTime: 75, // 1.25 minutes
    size: { width: 1, height: 1 },
    description: "Defensive structure that attacks nearby enemies.",
  },
  refinery: {
    maxHealth: 300,
    constructionTime: 80, // 1.33 minutes
    size: { width: 2, height: 3 },
    description: "Processes raw materials. Boosts carbon and fuel production.",
  },
  power_plant: {
    maxHealth: 350,
    constructionTime: 100, // 1.67 minutes
    size: { width: 3, height: 2 },
    description: "Generates energy. Boosts fuel production significantly.",
  },
}

// Upgrade costs (multiplier per level)
export const UPGRADE_COST_MULTIPLIER = 1.5

import { BUILDING_COSTS } from "./resource-constants"
export { BUILDING_COSTS }

// Calculate upgrade cost for a building
export function getUpgradeCost(buildingType: BuildingType, currentLevel: number): Partial<ResourceProduction> {
  const baseCost = BUILDING_COSTS[buildingType]
  const multiplier = Math.pow(UPGRADE_COST_MULTIPLIER, currentLevel)

  return {
    concrete: Math.floor((baseCost.concrete || 0) * multiplier),
    steel: Math.floor((baseCost.steel || 0) * multiplier),
    carbon: Math.floor((baseCost.carbon || 0) * multiplier),
    fuel: Math.floor((baseCost.fuel || 0) * multiplier),
  }
}
