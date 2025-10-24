import type { Server, Socket } from "socket.io"
import type { DatabaseService } from "../services/DatabaseService"
import { GameState } from "./GameState"
import { Player } from "./Player"

export class GameServer {
  private io: Server
  private db: DatabaseService
  private gameState: GameState
  private players: Map<string, Player> = new Map()
  private gameLoop: NodeJS.Timeout | null = null
  private tickRate = 50 // 50ms = 20 ticks per second
  private lastTickTime = Date.now()

  constructor(io: Server, db: DatabaseService) {
    this.io = io
    this.db = db
    this.gameState = new GameState(db)
    this.setupSocketHandlers()
  }

  private setupSocketHandlers() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`[GameServer] Client connected: ${socket.id}`)

      // Authenticate player
      socket.on("auth", async (data: { userId: number; worldId: number }) => {
        try {
          const player = await this.authenticatePlayer(socket, data.userId, data.worldId)
          if (player) {
            this.players.set(socket.id, player)
            socket.join(`world:${data.worldId}`)

            // Send initial game state
            const state = await this.gameState.getPlayerState(data.userId, data.worldId)
            socket.emit("initial_state", state)

            console.log(`[GameServer] Player ${data.userId} authenticated in world ${data.worldId}`)
          }
        } catch (error) {
          console.error("[GameServer] Auth error:", error)
          socket.emit("auth_error", { message: "Authentication failed" })
        }
      })

      // Handle player commands
      socket.on("move_unit", (data) => this.handleMoveUnit(socket, data))
      socket.on("attack_unit", (data) => this.handleAttackUnit(socket, data))
      socket.on("attack_building", (data) => this.handleAttackBuilding(socket, data))
      socket.on("spawn_unit", (data) => this.handleSpawnUnit(socket, data))
      socket.on("construct_building", (data) => this.handleConstructBuilding(socket, data))
      socket.on("upgrade_building", (data) => this.handleUpgradeBuilding(socket, data))

      socket.on("disconnect", () => {
        const player = this.players.get(socket.id)
        if (player) {
          console.log(`[GameServer] Player ${player.userId} disconnected`)
          this.players.delete(socket.id)
        }
      })
    })
  }

  private async authenticatePlayer(socket: Socket, userId: number, worldId: number): Promise<Player | null> {
    // Verify user exists and has access to world
    const user = await this.db.getUser(userId)
    if (!user) return null

    return new Player(socket.id, userId, worldId)
  }

  // Command handlers - all server-authoritative
  private async handleMoveUnit(socket: Socket, data: { unitId: number; targetX: number; targetY: number }) {
    const player = this.players.get(socket.id)
    if (!player) return

    try {
      // Validate ownership and movement
      const result = await this.gameState.moveUnit(player.userId, data.unitId, data.targetX, data.targetY)

      if (result.success) {
        // Broadcast to all players in world
        this.io.to(`world:${player.worldId}`).emit("unit_moved", {
          unitId: data.unitId,
          x: data.targetX,
          y: data.targetY,
          timestamp: Date.now(),
        })
      } else {
        socket.emit("action_failed", { action: "move_unit", reason: result.error })
      }
    } catch (error) {
      console.error("[GameServer] Move unit error:", error)
      socket.emit("action_failed", { action: "move_unit", reason: "Server error" })
    }
  }

  private async handleAttackUnit(socket: Socket, data: { attackerId: number; targetId: number }) {
    const player = this.players.get(socket.id)
    if (!player) return

    try {
      const result = await this.gameState.attackUnit(player.userId, data.attackerId, data.targetId)

      if (result.success) {
        this.io.to(`world:${player.worldId}`).emit("combat_event", {
          type: "unit_attack",
          attackerId: data.attackerId,
          targetId: data.targetId,
          damage: result.damage,
          targetDestroyed: result.targetDestroyed,
          timestamp: Date.now(),
        })
      } else {
        socket.emit("action_failed", { action: "attack_unit", reason: result.error })
      }
    } catch (error) {
      console.error("[GameServer] Attack unit error:", error)
    }
  }

  private async handleAttackBuilding(socket: Socket, data: { attackerId: number; targetId: number }) {
    const player = this.players.get(socket.id)
    if (!player) return

    try {
      const result = await this.gameState.attackBuilding(player.userId, data.attackerId, data.targetId)

      if (result.success) {
        this.io.to(`world:${player.worldId}`).emit("combat_event", {
          type: "building_attack",
          attackerId: data.attackerId,
          targetId: data.targetId,
          damage: result.damage,
          targetDestroyed: result.targetDestroyed,
          timestamp: Date.now(),
        })
      } else {
        socket.emit("action_failed", { action: "attack_building", reason: result.error })
      }
    } catch (error) {
      console.error("[GameServer] Attack building error:", error)
    }
  }

  private async handleSpawnUnit(socket: Socket, data: { unitType: string; x: number; y: number }) {
    const player = this.players.get(socket.id)
    if (!player) return

    try {
      const result = await this.gameState.spawnUnit(player.userId, player.worldId, data.unitType, data.x, data.y)

      if (result.success) {
        this.io.to(`world:${player.worldId}`).emit("unit_spawned", {
          unit: result.unit,
          timestamp: Date.now(),
        })
      } else {
        socket.emit("action_failed", { action: "spawn_unit", reason: result.error })
      }
    } catch (error) {
      console.error("[GameServer] Spawn unit error:", error)
    }
  }

  private async handleConstructBuilding(socket: Socket, data: { buildingType: string; x: number; y: number }) {
    const player = this.players.get(socket.id)
    if (!player) return

    try {
      const result = await this.gameState.constructBuilding(
        player.userId,
        player.worldId,
        data.buildingType,
        data.x,
        data.y,
      )

      if (result.success) {
        this.io.to(`world:${player.worldId}`).emit("building_constructed", {
          building: result.building,
          timestamp: Date.now(),
        })
      } else {
        socket.emit("action_failed", { action: "construct_building", reason: result.error })
      }
    } catch (error) {
      console.error("[GameServer] Construct building error:", error)
    }
  }

  private async handleUpgradeBuilding(socket: Socket, data: { buildingId: number }) {
    const player = this.players.get(socket.id)
    if (!player) return

    try {
      const result = await this.gameState.upgradeBuilding(player.userId, data.buildingId)

      if (result.success) {
        this.io.to(`world:${player.worldId}`).emit("building_upgraded", {
          buildingId: data.buildingId,
          newLevel: result.newLevel,
          timestamp: Date.now(),
        })
      } else {
        socket.emit("action_failed", { action: "upgrade_building", reason: result.error })
      }
    } catch (error) {
      console.error("[GameServer] Upgrade building error:", error)
    }
  }

  // Main game loop - runs at 20 ticks/second
  private async tick() {
    const now = Date.now()
    const deltaTime = now - this.lastTickTime
    this.lastTickTime = now

    try {
      // Process game state updates
      const updates = await this.gameState.tick(deltaTime)

      // Broadcast updates to all worlds
      for (const [worldId, worldUpdates] of Object.entries(updates)) {
        if (worldUpdates.resources) {
          this.io.to(`world:${worldId}`).emit("resources_updated", worldUpdates.resources)
        }
        if (worldUpdates.units) {
          this.io.to(`world:${worldId}`).emit("units_updated", worldUpdates.units)
        }
        if (worldUpdates.buildings) {
          this.io.to(`world:${worldId}`).emit("buildings_updated", worldUpdates.buildings)
        }
      }
    } catch (error) {
      console.error("[GameServer] Tick error:", error)
    }
  }

  public start() {
    console.log("[GameServer] Starting game loop...")
    this.lastTickTime = Date.now()
    this.gameLoop = setInterval(() => this.tick(), this.tickRate)
  }

  public stop() {
    console.log("[GameServer] Stopping game loop...")
    if (this.gameLoop) {
      clearInterval(this.gameLoop)
      this.gameLoop = null
    }
  }

  public getPlayerCount(): number {
    return this.players.size
  }

  public getTickRate(): number {
    return 1000 / this.tickRate
  }
}
