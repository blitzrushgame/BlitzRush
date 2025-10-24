import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export class DatabaseService {
  private supabase: SupabaseClient

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  async getUser(userId: number) {
    const { data, error } = await this.supabase.from("users").select("*").eq("id", userId).single()

    if (error) throw error
    return data
  }

  async getPlayerGameState(userId: number, worldId: number) {
    const [resources, units, buildings, homeBase] = await Promise.all([
      this.getResources(userId, worldId),
      this.getUnits(userId, worldId),
      this.getBuildings(userId, worldId),
      this.getHomeBase(userId, worldId),
    ])

    return { resources, units, buildings, homeBase }
  }

  async getResources(userId: number, worldId: number) {
    const { data } = await this.supabase
      .from("resources")
      .select("*")
      .eq("user_id", userId)
      .eq("world_id", worldId)
      .single()

    return data
  }

  async getUnits(userId: number, worldId: number) {
    const { data } = await this.supabase.from("units").select("*").eq("user_id", userId).eq("world_id", worldId)

    return data || []
  }

  async getBuildings(userId: number, worldId: number) {
    const { data } = await this.supabase.from("buildings").select("*").eq("user_id", userId).eq("world_id", worldId)

    return data || []
  }

  async getHomeBase(userId: number, worldId: number) {
    const { data } = await this.supabase
      .from("buildings")
      .select("*")
      .eq("user_id", userId)
      .eq("world_id", worldId)
      .eq("type", "home_base")
      .single()

    return data
  }

  async getUnit(unitId: number) {
    const { data } = await this.supabase.from("units").select("*").eq("id", unitId).single()

    return data
  }

  async getBuilding(buildingId: number) {
    const { data } = await this.supabase.from("buildings").select("*").eq("id", buildingId).single()

    return data
  }

  async updateUnitPosition(unitId: number, x: number, y: number) {
    await this.supabase.from("units").update({ x, y, updated_at: new Date().toISOString() }).eq("id", unitId)
  }

  async updateUnitHealth(unitId: number, health: number) {
    await this.supabase.from("units").update({ health, updated_at: new Date().toISOString() }).eq("id", unitId)
  }

  async updateBuildingHealth(buildingId: number, health: number) {
    await this.supabase.from("buildings").update({ health, updated_at: new Date().toISOString() }).eq("id", buildingId)
  }

  async deleteUnit(unitId: number) {
    await this.supabase.from("units").delete().eq("id", unitId)
  }

  async deleteBuilding(buildingId: number) {
    await this.supabase.from("buildings").delete().eq("id", buildingId)
  }

  async logCombat(attackerId: number, defenderId: number, attackerUnitId: number, targetId: number, damage: number) {
    await this.supabase.from("combat_logs").insert({
      attacker_id: attackerId,
      defender_id: defenderId,
      attacker_unit_id: attackerUnitId,
      target_id: targetId,
      damage,
      timestamp: new Date().toISOString(),
    })
  }

  async createUnit(userId: number, worldId: number, unitType: string, x: number, y: number) {
    const { data } = await this.supabase
      .from("units")
      .insert({
        user_id: userId,
        world_id: worldId,
        type: unitType,
        x,
        y,
        health: 100,
        attack: 10,
        defense: 5,
      })
      .select()
      .single()

    return data
  }

  async createBuilding(userId: number, worldId: number, buildingType: string, x: number, y: number) {
    const { data } = await this.supabase
      .from("buildings")
      .insert({
        user_id: userId,
        world_id: worldId,
        type: buildingType,
        x,
        y,
        level: 1,
        health: 100,
      })
      .select()
      .single()

    return data
  }

  async upgradeBuildingLevel(buildingId: number, newLevel: number) {
    await this.supabase
      .from("buildings")
      .update({ level: newLevel, updated_at: new Date().toISOString() })
      .eq("id", buildingId)
  }

  async checkResources(userId: number, worldId: number, cost: Record<string, number>) {
    const resources = await this.getResources(userId, worldId)
    if (!resources) return false

    for (const [resource, amount] of Object.entries(cost)) {
      if ((resources[resource] || 0) < amount) {
        return false
      }
    }

    return true
  }

  async deductResources(userId: number, worldId: number, cost: Record<string, number>) {
    const resources = await this.getResources(userId, worldId)
    if (!resources) return

    const updates: Record<string, number> = {}
    for (const [resource, amount] of Object.entries(cost)) {
      updates[resource] = (resources[resource] || 0) - amount
    }

    await this.supabase.from("resources").update(updates).eq("user_id", userId).eq("world_id", worldId)
  }

  async generateResourcesForAllPlayers() {
    // Get all active players (those with resources)
    const { data: allResources } = await this.supabase.from("resources").select("*")

    if (!allResources) return []

    const updates = []

    for (const resource of allResources) {
      // Generate resources based on production rate (simplified)
      const productionRate = 10 // Base production per 5 seconds

      const newConcrete = (resource.concrete || 0) + productionRate
      const newSteel = (resource.steel || 0) + productionRate
      const newCarbon = (resource.carbon || 0) + productionRate
      const newFuel = (resource.fuel || 0) + productionRate

      await this.supabase
        .from("resources")
        .update({
          concrete: newConcrete,
          steel: newSteel,
          carbon: newCarbon,
          fuel: newFuel,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", resource.user_id)
        .eq("world_id", resource.world_id)

      updates.push({
        user_id: resource.user_id,
        world_id: resource.world_id,
        concrete: newConcrete,
        steel: newSteel,
        carbon: newCarbon,
        fuel: newFuel,
      })
    }

    return updates
  }
}
