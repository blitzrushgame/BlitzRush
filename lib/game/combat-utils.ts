import { calculateDistance, type Position } from "./movement-utils"

export interface CombatResult {
  attackerDamage: number
  defenderDamage: number
  attackerDied: boolean
  defenderDied: boolean
  attackerNewHealth: number
  defenderNewHealth: number
}

/**
 * Calculate damage dealt in combat
 */
export function calculateDamage(attackerAttack: number, defenderDefense: number): number {
  // Base damage formula: attack - (defense / 2)
  // Minimum damage is 1
  const baseDamage = attackerAttack - Math.floor(defenderDefense / 2)
  return Math.max(1, baseDamage)
}

/**
 * Check if attacker is in range of target
 */
export function isInAttackRange(attackerPos: Position, targetPos: Position, attackRange = 5): boolean {
  const distance = calculateDistance(attackerPos, targetPos)
  return distance <= attackRange
}

/**
 * Simulate combat between two units
 */
export function simulateCombat(
  attacker: {
    attack: number
    defense: number
    health: number
    maxHealth: number
  },
  defender: {
    attack: number
    defense: number
    health: number
    maxHealth: number
  },
): CombatResult {
  // Calculate damage dealt by attacker
  const attackerDamage = calculateDamage(attacker.attack, defender.defense)

  // Defender counter-attacks if still alive
  let defenderDamage = 0
  let attackerNewHealth = attacker.health
  const defenderNewHealth = defender.health - attackerDamage

  // Check if defender survives to counter-attack
  if (defenderNewHealth > 0) {
    defenderDamage = calculateDamage(defender.attack, attacker.defense)
    attackerNewHealth = attacker.health - defenderDamage
  }

  return {
    attackerDamage,
    defenderDamage,
    attackerDied: attackerNewHealth <= 0,
    defenderDied: defenderNewHealth <= 0,
    attackerNewHealth: Math.max(0, attackerNewHealth),
    defenderNewHealth: Math.max(0, defenderNewHealth),
  }
}

/**
 * Calculate combat between unit and building
 */
export function simulateUnitVsBuilding(
  attacker: {
    attack: number
    health: number
  },
  building: {
    defense: number
    health: number
  },
): {
  damage: number
  buildingDestroyed: boolean
  buildingNewHealth: number
} {
  // Buildings don't counter-attack (unless it's a defense tower, handled separately)
  const damage = calculateDamage(attacker.attack, building.defense)
  const buildingNewHealth = building.health - damage

  return {
    damage,
    buildingDestroyed: buildingNewHealth <= 0,
    buildingNewHealth: Math.max(0, buildingNewHealth),
  }
}
