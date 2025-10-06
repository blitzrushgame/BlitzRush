// Game world and state types
export interface GameWorld {
  id: number
  name: string
  description: string
  map_data: Record<string, any>
  created_at: string
}

export interface Tank {
  id: string
  type: "tank1" | "tank2"
  x: number
  y: number
  targetX?: number
  targetY?: number
  isSelected: boolean
  isMoving: boolean
  health: number
  maxHealth: number
  created_at: number
}

export interface Base {
  id: string
  x: number
  y: number
  health: number
  maxHealth: number
  level: number
  productionQueue: ProductionItem[]
  resources: {
    metal: number
    energy: number
  }
}

export interface ProductionItem {
  id: string
  type: "tank1" | "tank2"
  startTime: number
  duration: number // in milliseconds
}

export interface UserGameState {
  id: string
  user_id: string
  world_id: number
  game_data: {
    tanks: Tank[]
    base: Base
    camera: {
      x: number
      y: number
      zoom: number
    }
    lastSaved: number
  }
  last_played: string
  created_at: string
}

export interface UserProfile {
  id: string
  username: string
  display_name: string
  created_at: string
  updated_at: string
}

export interface GameStateData {
  camera: {
    x: number
    y: number
    zoom: number
  }
  buildings: any[]
  units: any[]
  resources: {
    concrete: number
    steel: number
    carbon: number
    fuel: number
  }
  selectedUnits: any[]
  selectionBox: {
    start: { x: number; y: number } | null
    end: { x: number; y: number } | null
  }
  isDragging: boolean
  isSelecting: boolean
  dragStart: { x: number; y: number } | null
}
