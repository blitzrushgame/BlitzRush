// Resource production and game balance constants

export const RESOURCE_TYPES = {
  CONCRETE: "concrete",
  STEEL: "steel",
  CARBON: "carbon",
  FUEL: "fuel",
} as const

export type ResourceType = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES]

// Base production rates (per hour)
export const BASE_PRODUCTION_RATES = {
  concrete: 50,
  steel: 30,
  carbon: 20,
  fuel: 15,
}

// Storage capacities
export const STORAGE_CAPACITY = {
  concrete: 10000,
  steel: 10000,
  carbon: 5000,
  fuel: 5000,
}

// Starting resources for new players
export const STARTING_RESOURCES = {
  concrete: 1000,
  steel: 1000,
  carbon: 500,
  fuel: 500,
}

// Building production bonuses (multipliers)
export const BUILDING_PRODUCTION_BONUS = {
  mine: { concrete: 2.0, steel: 1.5 },
  factory: { steel: 2.0, carbon: 1.5 },
  refinery: { carbon: 2.0, fuel: 2.5 },
  power_plant: { fuel: 2.0 },
}

// Resource costs for buildings
export const BUILDING_COSTS = {
  base: { concrete: 500, steel: 300, carbon: 100, fuel: 50 },
  barracks: { concrete: 300, steel: 200, carbon: 50, fuel: 25 },
  factory: { concrete: 400, steel: 300, carbon: 150, fuel: 100 },
  mine: { concrete: 250, steel: 150, carbon: 50, fuel: 25 },
  defense_tower: { concrete: 200, steel: 250, carbon: 100, fuel: 50 },
  refinery: { concrete: 350, steel: 250, carbon: 200, fuel: 150 },
  power_plant: { concrete: 400, steel: 300, carbon: 250, fuel: 200 },
}

// Resource costs for units
export const UNIT_COSTS = {
  soldier: { concrete: 50, steel: 25, carbon: 10, fuel: 5 },
  tank: { concrete: 150, steel: 200, carbon: 100, fuel: 75 },
  artillery: { concrete: 200, steel: 250, carbon: 150, fuel: 100 },
  aircraft: { concrete: 100, steel: 300, carbon: 200, fuel: 250 },
}
