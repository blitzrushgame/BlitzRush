import type { DatabaseService } from "../services/DatabaseService"

interface GameUpdate {
  [worldId: string]: {
    resources?: any[]
    units?: any[]
    buildings?: any[]
  }
}

export class GameState {
  private db: DatabaseService
  private lastResourceUpdate = Date.now()
  private resourceUpdateInterval = 5000 // 5 seconds

  constructor(db: DatabaseService) {
    this.db = db
  }

  async tick(deltaTime: number): Promise<GameUpdate> {
    const updates: GameUpdate = {}
    const now = Date.now()

    // Generate resources every 5 seconds
    if (now - this.lastResourceUpdate >= this.resourceUpdateInterval) {
      const resourceUpdates = await this.generateResources()

      // Group by world
      for (const update of resourceUpdates) {
        if (!updates[update.world_id]) {
          updates[update.world_id] = {}
        }
        if (!updates[update.world_id].resources) {
          updates[update.world_id].resources = []
        }
        updates[update.world_id].resources.push(update)
      }

      this.lastResourceUpdate = now
    }

    return updates
  }

  private async generateResources() {
    // Server-side resource generation
    return await this.db.generateResourcesForAllPlayers()
  }

  async getPlayerState(userId: number, worldId: number) {
    return await this.db.getPlayerGameState(userId, worldId)
  }

  async moveUnit(userId: number, unitId: number, targetX: number, targetY: number) {
    // Validate ownership
    const unit = await this.db.getUnit(unitId)
    if (!unit || unit.user_id !== userId) {
      return { success: false, error: "Unit not found or not owned" }
    }

    // Validate position (within world bounds)
    if (targetX < 0 || targetX > 2000 || targetY < 0 || targetY > 2000) {
      return { success: false, error: "Invalid position" }
    }

    // Update unit position
    await this.db.updateUnitPosition(unitId, targetX, targetY)

    return { success: true }
  }

  async attackUnit(userId: number, attackerId: number, targetId: number) {
    // Validate attacker ownership
    const attacker = await this.db.getUnit(attackerId)
    if (!attacker || attacker.user_id !== userId) {
      return { success: false, error: "Attacker not found or not owned" }
    }

    const target = await this.db.getUnit(targetId)
    if (!target) {
      return { success: false, error: "Target not found" }
    }

    // Calculate damage (simplified)
    const damage = attacker.attack || 10
    const newHealth = Math.max(0, target.health - damage)

    await this.db.updateUnitHealth(targetId, newHealth)

    // Log combat
    await this.db.logCombat(userId, target.user_id, attackerId, targetId, damage)

    const targetDestroyed = newHealth === 0
    if (targetDestroyed) {
      await this.db.deleteUnit(targetId)
    }

    return { success: true, damage, targetDestroyed }
  }

  async attackBuilding(userId: number, attackerId: number, targetId: number) {
    const attacker = await this.db.getUnit(attackerId)
    if (!attacker || attacker.user_id !== userId) {
      return { success: false, error: "Attacker not found or not owned" }
    }

    const target = await this.db.getBuilding(targetId)
    if (!target) {
      return { success: false, error: "Target not found" }
    }

    const damage = attacker.attack || 10
    const newHealth = Math.max(0, target.health - damage)

    await this.db.updateBuildingHealth(targetId, newHealth)
    await this.db.logCombat(userId, target.user_id, attackerId, targetId, damage)

    const targetDestroyed = newHealth === 0
    if (targetDestroyed) {
      await this.db.deleteBuilding(targetId)
    }

    return { success: true, damage, targetDestroyed }
  }

  async spawnUnit(userId: number, worldId: number, unitType: string, x: number, y: number) {
    // Check resource costs
    const cost = this.getUnitCost(unitType)
    const hasResources = await this.db.checkResources(userId, worldId, cost)

    if (!hasResources) {
      return { success: false, error: "Insufficient resources" }
    }

    // Deduct resources
    await this.db.deductResources(userId, worldId, cost)

    // Create unit
    const unit = await this.db.createUnit(userId, worldId, unitType, x, y)

    return { success: true, unit }
  }

  async constructBuilding(userId: number, worldId: number, buildingType: string, x: number, y: number) {
    const cost = this.getBuildingCost(buildingType)
    const hasResources = await this.db.checkResources(userId, worldId, cost)

    if (!hasResources) {
      return { success: false, error: "Insufficient resources" }
    }

    await this.db.deductResources(userId, worldId, cost)
    const building = await this.db.createBuilding(userId, worldId, buildingType, x, y)

    return { success: true, building }
  }

  async upgradeBuilding(userId: number, buildingId: number) {
    const building = await this.db.getBuilding(buildingId)
    if (!building || building.user_id !== userId) {
      return { success: false, error: "Building not found or not owned" }
    }

    const cost = this.getUpgradeCost(building.type, building.level)
    const hasResources = await this.db.checkResources(userId, building.world_id, cost)

    if (!hasResources) {
      return { success: false, error: "Insufficient resources" }
    }

    await this.db.deductResources(userId, building.world_id, cost)
    const newLevel = building.level + 1
    await this.db.upgradeBuildingLevel(buildingId, newLevel)

    return { success: true, newLevel }
  }

  private getUnitCost(unitType: string) {
    // Define unit costs
    const costs: Record<string, any> = {
      soldier: { concrete: 50, steel: 30 },
      tank: { concrete: 100, steel: 150, fuel: 50 },
      // Add more unit types
    }
    return costs[unitType] || { concrete: 50 }
  }

  private getBuildingCost(buildingType: string) {
    const costs: Record<string, any> = {
      barracks: { concrete: 200, steel: 100 },
      factory: { concrete: 500, steel: 300 },
      // Add more building types
    }
    return costs[buildingType] || { concrete: 100 }
  }

  private getUpgradeCost(buildingType: string, currentLevel: number) {
    const baseCost = this.getBuildingCost(buildingType)
    const multiplier = 1.5 * currentLevel

    return Object.entries(baseCost).reduce(
      (acc, [key, value]) => {
        acc[key] = Math.floor((value as number) * multiplier)
        return acc
      },
      {} as Record<string, number>,
    )
  }
}
