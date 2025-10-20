export const UNIT_TYPES = {
  SOLDIER: "soldier",
  TANK: "tank",
  ARTILLERY: "artillery",
  AIRCRAFT: "aircraft",
} as const

export type UnitType = (typeof UNIT_TYPES)[keyof typeof UNIT_TYPES]

export interface UnitStats {
  maxHealth: number
  attack: number
  defense: number
  movementSpeed: number
  trainingTime: number // in seconds
  requiredBuilding: string // building type required to train
  description: string
}

// Unit statistics by type
export const UNIT_STATS: Record<UnitType, UnitStats> = {
  soldier: {
    maxHealth: 100,
    attack: 15,
    defense: 10,
    movementSpeed: 2,
    trainingTime: 30, // 30 seconds
    requiredBuilding: "barracks",
    description: "Basic infantry unit. Fast and cheap.",
  },
  tank: {
    maxHealth: 300,
    attack: 50,
    defense: 40,
    movementSpeed: 1,
    trainingTime: 90, // 1.5 minutes
    requiredBuilding: "factory",
    description: "Heavy armored vehicle. High damage and defense.",
  },
  artillery: {
    maxHealth: 150,
    attack: 80,
    defense: 15,
    movementSpeed: 1,
    trainingTime: 120, // 2 minutes
    requiredBuilding: "factory",
    description: "Long-range siege unit. High damage but fragile.",
  },
  aircraft: {
    maxHealth: 200,
    attack: 60,
    defense: 20,
    movementSpeed: 3,
    trainingTime: 150, // 2.5 minutes
    requiredBuilding: "factory",
    description: "Fast air unit. Can move over obstacles.",
  },
}

// Import unit costs from resource-constants
import { UNIT_COSTS } from "./resource-constants"

export { UNIT_COSTS }
