import { createClient } from "@/lib/supabase/client"
import { createClient as createServerClient } from "@/lib/supabase/server"
import type { UserGameState, GameWorld, Tank, Base } from "@/lib/types/game"

// Default game state for new players
export const createDefaultGameState = (worldId: number): UserGameState["game_data"] => ({
  tanks: [],
  base: {
    id: "main-base",
    x: 400,
    y: 300,
    health: 100,
    maxHealth: 100,
    level: 1,
    productionQueue: [],
    resources: {
      metal: 100,
      energy: 50,
    },
  },
  camera: {
    x: 0,
    y: 0,
    zoom: 1,
  },
  lastSaved: Date.now(),
})

// Client-side game state management
export class GameStateManager {
  private supabase = createClient()
  private currentState: UserGameState["game_data"] | null = null
  private worldId: number | null = null
  private userId: number | null = null
  private saveInterval: NodeJS.Timeout | null = null

  async initialize(worldId: number) {
    this.worldId = worldId

    const response = await fetch("/api/auth/session")
    const data = await response.json()

    if (!data.userId) throw new Error("User not authenticated")
    this.userId = data.userId

    // Load existing game state or create new one
    await this.loadGameState()

    // Auto-save every 30 seconds
    this.startAutoSave()
  }

  async loadGameState() {
    if (!this.userId || !this.worldId) return

    const { data, error } = await this.supabase
      .from("user_game_states")
      .select("*")
      .eq("user_id", this.userId)
      .eq("world_id", this.worldId)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      console.error("Error loading game state:", error)
      return
    }

    if (data) {
      this.currentState = data.game_data
    } else {
      // Create new game state
      this.currentState = createDefaultGameState(this.worldId)
      await this.saveGameState()
    }
  }

  async saveGameState() {
    if (!this.userId || !this.worldId || !this.currentState) return

    this.currentState.lastSaved = Date.now()

    const { error } = await this.supabase.from("user_game_states").upsert({
      user_id: this.userId,
      world_id: this.worldId,
      game_data: this.currentState,
      last_played: new Date().toISOString(),
    })

    if (error) {
      console.error("Error saving game state:", error)
    }
  }

  getState() {
    return this.currentState
  }

  updateState(updates: Partial<UserGameState["game_data"]>) {
    if (!this.currentState) return

    this.currentState = {
      ...this.currentState,
      ...updates,
    }
  }

  addTank(tank: Tank) {
    if (!this.currentState) return

    this.currentState.tanks.push(tank)
  }

  updateTank(tankId: string, updates: Partial<Tank>) {
    if (!this.currentState) return

    const tankIndex = this.currentState.tanks.findIndex((t) => t.id === tankId)
    if (tankIndex !== -1) {
      this.currentState.tanks[tankIndex] = {
        ...this.currentState.tanks[tankIndex],
        ...updates,
      }
    }
  }

  removeTank(tankId: string) {
    if (!this.currentState) return

    this.currentState.tanks = this.currentState.tanks.filter((t) => t.id !== tankId)
  }

  updateBase(updates: Partial<Base>) {
    if (!this.currentState) return

    this.currentState.base = {
      ...this.currentState.base,
      ...updates,
    }
  }

  private startAutoSave() {
    this.saveInterval = setInterval(() => {
      this.saveGameState()
    }, 30000) // Save every 30 seconds
  }

  cleanup() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
      this.saveInterval = null
    }
    // Final save before cleanup
    this.saveGameState()
  }
}

// Server-side utilities
export async function getGameWorlds() {
  const supabase = await createServerClient()

  const { data, error } = await supabase.from("game_worlds").select("*").order("id")

  if (error) {
    console.error("Error fetching game worlds:", error)
    return []
  }

  return data as GameWorld[]
}

export async function getUserGameStates(userId: number) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("user_game_states")
    .select(`
      *,
      game_worlds (
        id,
        name,
        description
      )
    `)
    .eq("user_id", userId)
    .order("last_updated", { ascending: false })

  if (error) {
    console.error("Error fetching user game states:", error)
    return []
  }

  return data
}
