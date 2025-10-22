"use client"

import type React from "react"
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { useRouter } from "next/navigation"
import type { GameStateData } from "@/lib/types/game"
import { ChevronDown } from "lucide-react"
import Minimap from "./minimap"
import {
  WORLD_SIZE_TILES,
  TILE_SIZE_PX,
  GRASS_PNG_SIZE_TILES,
  GRASS_PNG_SIZE_PX,
  CAMERA_MOVE_SPEED,
  clampTileCoords,
} from "@/lib/game/constants"

interface GameCanvasProps {
  initialState: GameStateData
  onStateChange: (state: GameStateData) => void
  worldId: string
  onMapChange: (mapId: number) => void // Changed from onOpenMapSelector to onMapChange
  currentMap: number
  onSendCoordinateMessage?: (message: string) => void
}

export interface GameCanvasRef {
  updateCamera: (x: number, y: number) => void
}

const GameCanvas = forwardRef<GameCanvasRef, GameCanvasProps>(
  (
    {
      initialState,
      onStateChange,
      worldId,
      onMapChange, // Updated prop name
      currentMap,
      onSendCoordinateMessage,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [gameState, setGameState] = useState<GameStateData>(initialState)
    const [showMapMenu, setShowMapMenu] = useState(false)
    const grassTileRef = useRef<HTMLImageElement | null>(null)
    const burnMarkRefs = useRef<(HTMLImageElement | null)[]>([null, null, null, null])
    const homeBaseRef = useRef<HTMLImageElement | null>(null)
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 })
    const [userId, setUserId] = useState<number | null>(null)
    const [username, setUsername] = useState<string>("Player")
    const [allianceId, setAllianceId] = useState<number | null>(null)
    const router = useRouter()

    const keysRef = useRef<Set<string>>(new Set())
    const gameStateRef = useRef(gameState)
    const animationFrameRef = useRef<number>()
    const saveTimeoutRef = useRef<NodeJS.Timeout>()

    useImperativeHandle(ref, () => ({
      updateCamera: (x: number, y: number) => {
        console.log("[v0] updateCamera called with tile coords:", x, y)
        setGameState((prev) => {
          const clamped = clampTileCoords(x, y)

          const newState = {
            ...prev,
            camera: {
              ...prev.camera,
              x: clamped.x,
              y: clamped.y,
            },
          }

          onStateChange(newState)
          return newState
        })
      },
    }))

    useEffect(() => {
      gameStateRef.current = gameState
    }, [gameState])

    useEffect(() => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        console.log("[v0] Grass tile loaded successfully")
        grassTileRef.current = img
      }
      img.onerror = () => {
        console.error("[v0] Failed to load grass tile")
      }
      img.src = "/images/grass-tile.png"

      const burnMarkPaths = [
        "/images/burn-mark-1.png",
        "/images/burn-mark-2.png",
        "/images/burn-mark-4.png",
        "/images/burn-mark-5.png",
      ]

      burnMarkPaths.forEach((path, index) => {
        const burnImg = new Image()
        burnImg.crossOrigin = "anonymous"
        burnImg.onload = () => {
          console.log(`[v0] Burn mark ${index + 1} loaded successfully`)
          burnMarkRefs.current[index] = burnImg
        }
        burnImg.onerror = () => {
          console.error(`[v0] Failed to load burn mark ${index + 1}`)
        }
        burnImg.src = path
      })

      const homeBaseImg = new Image()
      homeBaseImg.crossOrigin = "anonymous"
      homeBaseImg.onload = () => {
        console.log("[v0] Home base loaded successfully")
        homeBaseRef.current = homeBaseImg
      }
      homeBaseImg.onerror = () => {
        console.error("[v0] Failed to load home base")
      }
      homeBaseImg.src = "/images/base/player-info-bar.png"
    }, [])

    useEffect(() => {
      const checkAuth = async () => {
        const response = await fetch("/api/auth/check")
        const data = await response.json()

        if (!data.authenticated) {
          router.push("/")
          return
        }

        setUserId(Number(data.userId))
        localStorage.setItem("userId", data.userId.toString())
        const userResponse = await fetch(`/api/user/${data.userId}`)
        const userData = await userResponse.json()
        setUsername(userData.username || "Player")
        setAllianceId(userData.alliance_id)

        await loadGameState(Number(data.userId), currentMap)
      }

      checkAuth()
    }, [currentMap])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const resizeCanvas = () => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        setCanvasDimensions({ width: window.innerWidth, height: window.innerHeight })
      }

      resizeCanvas()
      window.addEventListener("resize", resizeCanvas)

      const handleKeyDown = (e: KeyboardEvent) => {
        const activeElement = document.activeElement
        const isTyping = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement

        if (isTyping) {
          return
        }

        if (e.key.toLowerCase() === "c" && onSendCoordinateMessage) {
          const coordMessage = `[MAP:${currentMap}:${Math.round(gameStateRef.current.camera.x)}:${Math.round(gameStateRef.current.camera.y)}]`
          onSendCoordinateMessage(coordMessage)
          return
        }

        keysRef.current.add(e.key.toLowerCase())
      }

      const handleKeyUp = (e: KeyboardEvent) => {
        keysRef.current.delete(e.key.toLowerCase())
      }

      window.addEventListener("keydown", handleKeyDown)
      window.addEventListener("keyup", handleKeyUp)

      const gameLoop = () => {
        let deltaX = 0
        let deltaY = 0

        if (keysRef.current.has("w") || keysRef.current.has("arrowup")) deltaY -= CAMERA_MOVE_SPEED
        if (keysRef.current.has("s") || keysRef.current.has("arrowdown")) deltaY += CAMERA_MOVE_SPEED
        if (keysRef.current.has("a") || keysRef.current.has("arrowleft")) deltaX -= CAMERA_MOVE_SPEED
        if (keysRef.current.has("d") || keysRef.current.has("arrowright")) deltaX += CAMERA_MOVE_SPEED

        if (deltaX !== 0 || deltaY !== 0) {
          setGameState((prev) => {
            const newX = prev.camera.x + deltaX
            const newY = prev.camera.y + deltaY

            const clamped = clampTileCoords(newX, newY)

            return {
              ...prev,
              camera: {
                ...prev.camera,
                x: clamped.x,
                y: clamped.y,
              },
            }
          })
        }

        ctx.fillStyle = "#2a2a2a"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        const currentState = gameStateRef.current

        drawIsometricTerrain(ctx, currentState.camera)

        if (currentState.selectionBox.start && currentState.selectionBox.end) {
          drawSelectionBox(ctx, currentState.selectionBox.start, currentState.selectionBox.end)
        }

        animationFrameRef.current = requestAnimationFrame(gameLoop)
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop)

      return () => {
        window.removeEventListener("resize", resizeCanvas)
        window.removeEventListener("keydown", handleKeyDown)
        window.removeEventListener("keyup", handleKeyUp)
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }
    }, [])

    const drawIsometricTerrain = (ctx: CanvasRenderingContext2D, camera: { x: number; y: number; zoom: number }) => {
      const cameraTileX = camera.x
      const cameraTileY = camera.y
      const cameraPixelX = cameraTileX * TILE_SIZE_PX * camera.zoom
      const cameraPixelY = cameraTileY * TILE_SIZE_PX * camera.zoom

      const tileSize = TILE_SIZE_PX * camera.zoom
      const tileWidth = tileSize
      const tileHeight = tileSize * 0.7

      const visibleTilesX = Math.ceil(ctx.canvas.width / tileWidth) + 2
      const visibleTilesY = Math.ceil(ctx.canvas.height / tileHeight) + 2

      const startX = Math.max(0, Math.floor(cameraTileX - visibleTilesX / 2))
      const endX = Math.min(WORLD_SIZE_TILES, Math.ceil(cameraTileX + visibleTilesX / 2))
      const startY = Math.max(0, Math.floor(cameraTileY - visibleTilesY / 2))
      const endY = Math.min(WORLD_SIZE_TILES, Math.ceil(cameraTileY + visibleTilesY / 2))

      for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
          const screenX = (x - cameraTileX) * tileWidth + ctx.canvas.width / 2
          const screenY = (y - cameraTileY) * tileHeight + ctx.canvas.height / 2

          const terrainType = (x + y) % 3
          let tileColor = "#4a4a4a"

          if (terrainType === 0) tileColor = "#3a4a3a"
          else if (terrainType === 1) tileColor = "#4a3a3a"
          else tileColor = "#4a4a4a"

          ctx.fillStyle = tileColor
          ctx.beginPath()
          ctx.moveTo(screenX, screenY)
          ctx.lineTo(screenX + tileWidth / 2, screenY + tileHeight / 2)
          ctx.lineTo(screenX, screenY + tileHeight)
          ctx.lineTo(screenX - tileWidth / 2, screenY + tileHeight / 2)
          ctx.closePath()
          ctx.fill()

          ctx.strokeStyle = "#666666"
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }

      if (grassTileRef.current) {
        const grassPngSizePx = GRASS_PNG_SIZE_PX * camera.zoom

        const grassStartX = Math.floor(startX / GRASS_PNG_SIZE_TILES) * GRASS_PNG_SIZE_TILES
        const grassEndX = Math.ceil(endX / GRASS_PNG_SIZE_TILES) * GRASS_PNG_SIZE_TILES
        const grassStartY = Math.floor(startY / GRASS_PNG_SIZE_TILES) * GRASS_PNG_SIZE_TILES
        const grassEndY = Math.ceil(endY / GRASS_PNG_SIZE_TILES) * GRASS_PNG_SIZE_TILES

        ctx.filter = "brightness(1.09)"

        for (let x = grassStartX; x < grassEndX; x += GRASS_PNG_SIZE_TILES) {
          for (let y = grassStartY; y < grassEndY; y += GRASS_PNG_SIZE_TILES) {
            const screenX = (x - cameraTileX) * TILE_SIZE_PX * camera.zoom + ctx.canvas.width / 2
            const screenY = (y - cameraTileY) * TILE_SIZE_PX * camera.zoom + ctx.canvas.height / 2

            ctx.drawImage(grassTileRef.current, screenX, screenY, grassPngSizePx, grassPngSizePx)
          }
        }

        ctx.filter = "none"
      }

      if (homeBaseRef.current && userId) {
        const fetchHomeBase = async () => {
          try {
            const response = await fetch(`/api/game/home-base/status?userId=${userId}`)
            if (response.ok) {
              const data = await response.json()
              if (data.homeBase && data.homeBase.world_id === currentMap) {
                const baseTileX = data.homeBase.x
                const baseTileY = data.homeBase.y
                const baseWidth = 800 * camera.zoom
                const baseHeight = 600 * camera.zoom

                const screenX =
                  (baseTileX - cameraTileX) * TILE_SIZE_PX * camera.zoom + ctx.canvas.width / 2 - baseWidth / 2
                const screenY =
                  (baseTileY - cameraTileY) * TILE_SIZE_PX * camera.zoom + ctx.canvas.height / 2 - baseHeight / 2

                ctx.drawImage(homeBaseRef.current!, screenX, screenY, baseWidth, baseHeight)

                const factories = [
                  { x: -180, y: -120, color: "#ff4444", label: "Steel" },
                  { x: 40, y: -140, color: "#4444ff", label: "Carbon" },
                  { x: 140, y: 60, color: "#44ff44", label: "Concrete" },
                  { x: -20, y: 120, color: "#ffaa00", label: "Fuel" },
                ]

                factories.forEach((factory) => {
                  const factoryScreenX = screenX + baseWidth / 2 + factory.x * camera.zoom
                  const factoryScreenY = screenY + baseHeight / 2 + factory.y * camera.zoom
                  const factorySize = 60 * camera.zoom

                  ctx.fillStyle = factory.color
                  ctx.fillRect(
                    factoryScreenX - factorySize / 2,
                    factoryScreenY - factorySize / 2,
                    factorySize,
                    factorySize,
                  )

                  ctx.strokeStyle = "#ffffff"
                  ctx.lineWidth = 2
                  ctx.strokeRect(
                    factoryScreenX - factorySize / 2,
                    factoryScreenY - factorySize / 2,
                    factorySize,
                    factorySize,
                  )

                  ctx.fillStyle = "#ffffff"
                  ctx.font = `${12 * camera.zoom}px Arial`
                  ctx.textAlign = "center"
                  ctx.textBaseline = "middle"
                  ctx.fillText(factory.label, factoryScreenX, factoryScreenY)
                })
              }
            }
          } catch (error) {
            console.error("[v0] Error fetching home base for rendering:", error)
          }
        }

        fetchHomeBase()
      }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      if (e.button === 0) {
        setGameState((prev) => ({
          ...prev,
          isSelecting: true,
          selectionBox: { start: { x, y }, end: { x, y } },
        }))
      } else if (e.button === 2) {
        setGameState((prev) => ({
          ...prev,
          isDragging: true,
          dragStart: { x, y },
        }))
      }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      if (gameState.isSelecting && gameState.selectionBox.start) {
        setGameState((prev) => ({
          ...prev,
          selectionBox: { ...prev.selectionBox, end: { x, y } },
        }))
      } else if (gameState.isDragging && gameState.dragStart) {
        const deltaX = x - gameState.dragStart.x
        const deltaY = y - gameState.dragStart.y
        const tileDeltaX = deltaX / (TILE_SIZE_PX * gameState.camera.zoom)
        const tileDeltaY = deltaY / (TILE_SIZE_PX * gameState.camera.zoom)

        setGameState((prev) => {
          const newX = prev.camera.x - tileDeltaX
          const newY = prev.camera.y - tileDeltaY

          const clamped = clampTileCoords(newX, newY)

          return {
            ...prev,
            camera: {
              ...prev.camera,
              x: clamped.x,
              y: clamped.y,
            },
            dragStart: { x, y },
          }
        })
      }
    }

    const handleMouseUp = () => {
      setGameState((prev) => ({
        ...prev,
        isDragging: false,
        isSelecting: false,
        dragStart: null,
        selectionBox: { start: null, end: null },
      }))
    }

    const drawSelectionBox = (
      ctx: CanvasRenderingContext2D,
      start: { x: number; y: number },
      end: { x: number; y: number },
    ) => {
      const width = end.x - start.x
      const height = end.y - start.y

      ctx.fillStyle = "rgba(0, 255, 0, 0.1)"
      ctx.fillRect(start.x, start.y, width, height)

      ctx.strokeStyle = "#00ff00"
      ctx.lineWidth = 2
      ctx.setLineDash([8, 4])
      ctx.lineDashOffset = -(Date.now() / 50) % 12
      ctx.strokeRect(start.x, start.y, width, height)
      ctx.setLineDash([])
    }

    const handleMapSelect = (mapId: number) => {
      onMapChange(mapId)
      setShowMapMenu(false)
    }

    const handleCameraMove = (x: number, y: number) => {
      setGameState((prev) => {
        const clamped = clampTileCoords(x, y)

        return {
          ...prev,
          camera: {
            ...prev.camera,
            x: clamped.x,
            y: clamped.y,
          },
        }
      })
    }

    const totalMaps = 10
    const maps = Array.from({ length: totalMaps }, (_, i) => i + 1)

    const loadGameState = async (userId: number, mapId: number) => {
      // Placeholder for loadGameState logic
    }

    return (
      <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
          tabIndex={0}
        />

        <Minimap
          camera={gameState.camera}
          canvasWidth={canvasDimensions.width}
          canvasHeight={canvasDimensions.height}
          currentMap={currentMap}
          onCameraMove={handleCameraMove}
          userId={userId}
          username={username}
          allianceId={allianceId}
        />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div
            className="transition-transform duration-500 ease-out pointer-events-auto"
            style={{
              transform: showMapMenu ? "translateY(0)" : "translateY(calc(-100% + 50px))",
            }}
          >
            <div
              className="bg-neutral-800/95 backdrop-blur-md border-x border-b border-neutral-600/30 shadow-2xl"
              style={{ width: "900px" }}
            >
              <div className="p-6">
                <div className="mb-4 flex justify-between items-center px-4">
                  <a
                    href="/alliance"
                    className="inline-block px-6 py-2 bg-neutral-700/50 hover:bg-neutral-600/50 border border-amber-500/30 rounded text-amber-400 font-semibold transition-all hover:shadow-lg hover:shadow-amber-500/20"
                  >
                    ALLIANCE
                  </a>
                  <a
                    href="/profile"
                    className="inline-block px-6 py-2 bg-neutral-700/50 hover:bg-neutral-600/50 border border-amber-500/30 rounded text-amber-400 font-semibold transition-all hover:shadow-lg hover:shadow-amber-500/20"
                  >
                    PROFILE
                  </a>
                </div>

                <div className="grid grid-cols-10 gap-3">
                  {maps.map((mapId) => (
                    <button
                      key={mapId}
                      onClick={() => handleMapSelect(mapId)}
                      className={`
                      aspect-square rounded-lg font-bold text-lg transition-all
                      ${
                        mapId === currentMap
                          ? "bg-amber-500 hover:bg-amber-600 text-white border-2 border-amber-400 shadow-lg shadow-amber-500/50"
                          : "bg-neutral-700/50 hover:bg-neutral-600/50 text-neutral-300 border-2 border-neutral-600/50"
                      }
                    `}
                    >
                      {mapId}
                    </button>
                  ))}
                </div>
                <p className="text-neutral-400 text-sm text-center mt-4">Currently on Map {currentMap}</p>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => setShowMapMenu(!showMapMenu)}
                className="relative bg-neutral-800/95 backdrop-blur-md hover:bg-neutral-700/95 transition-all duration-300 shadow-xl group"
                style={{
                  width: "200px",
                  height: "50px",
                  clipPath: "polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)",
                }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    clipPath: "polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)",
                  }}
                >
                  <svg
                    className="absolute inset-0 w-full h-full"
                    style={{ overflow: "visible" }}
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M 0 0 L 200 0 L 180 50 L 20 50 Z"
                      fill="none"
                      stroke="#eab308"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                      style={{
                        strokeDasharray: "200 200 180",
                        strokeDashoffset: "0",
                      }}
                    />
                  </svg>
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-amber-400 font-bold text-sm">MENU</span>
                  <div className="flex gap-1 mt-0.5">
                    <ChevronDown
                      className={`w-3 h-3 text-amber-400 transition-transform duration-300 ${
                        showMapMenu ? "rotate-180" : ""
                      }`}
                    />
                    <ChevronDown
                      className={`w-3 h-3 text-amber-400 transition-transform duration-300 ${
                        showMapMenu ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>

                <div
                  className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/10 transition-colors duration-300"
                  style={{ clipPath: "polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)" }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  },
)

GameCanvas.displayName = "GameCanvas"

export default GameCanvas
