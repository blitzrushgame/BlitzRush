"use client"

import type React from "react"
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { useRouter } from "next/navigation"
import type { GameStateData } from "@/lib/types/game"
import { Menu } from "lucide-react"
import Minimap from "./minimap"
import BaseManagementMenu from "./base-management-menu"
import FullPageMenu from "./full-page-menu"
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
  onMapChange: (mapId: number) => void
  currentMap: number
  onSendCoordinateMessage?: (message: string) => void
  userId?: number | null
}

export interface GameCanvasRef {
  updateCamera: (x: number, y: number) => void
}

interface HomeBaseData {
  x: number
  y: number
  world_id: number
  is_visible: boolean
  user_id: number
  username: string
  alliance_id: number | null
}

interface DefenseData {
  defense_type: string
  level: number
  count: number
  damage_multiplier: number
}

declare global {
  interface Window {
    _lastBaseRenderLog?: number
  }
}

const GameCanvas = forwardRef<GameCanvasRef, GameCanvasProps>(
  (
    { initialState, onStateChange, worldId, onMapChange, currentMap, onSendCoordinateMessage, userId: userIdProp },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [gameState, setGameState] = useState<GameStateData>(initialState)
    const [showMapMenu, setShowMapMenu] = useState(false)
    const grassTileRef = useRef<HTMLImageElement | null>(null)
    const burnMarkRefs = useRef<(HTMLImageElement | null)[]>([null, null, null, null])
    const homeBaseRef = useRef<HTMLImageElement | null>(null)
    const turretSpritesRef = useRef<{ [key: number]: HTMLImageElement | null }>({
      1: null,
      2: null,
      3: null,
      4: null,
    })
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 })
    const [username, setUsername] = useState<string>("Player")
    const [allianceId, setAllianceId] = useState<number | null>(null)
    const homeBaseDataRef = useRef<HomeBaseData | null>(null)
    const [defenseData, setDefenseData] = useState<DefenseData | null>(null)
    const turretAnimationRef = useRef<{
      currentFrame: number
      lastFrameTime: number
      nextAnimationTime: number
    }>({
      currentFrame: 0,
      lastFrameTime: 0,
      nextAnimationTime: 0,
    })
    const router = useRouter()
    const gameStateRef = useRef<GameStateData>(initialState)
    const keysRef = useRef<Set<string>>(new Set())
    const animationFrameRef = useRef<number | null>(null)
    const [showUpgradeMenu, setShowUpgradeMenu] = useState(false)
    const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
    const [showFullMenu, setShowFullMenu] = useState(false)

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
        console.log("[v0] Home base image loaded successfully")
        homeBaseRef.current = homeBaseImg
      }
      homeBaseImg.onerror = () => {
        console.error("[v0] Failed to load home base image")
      }
      homeBaseImg.src = "/images/base/BaseLayout.png"

      for (let level = 1; level <= 4; level++) {
        const turretImg = new Image()
        turretImg.crossOrigin = "anonymous"
        turretImg.onload = () => {
          console.log(`[v0] Turret level ${level} sprite loaded successfully`)
          turretSpritesRef.current[level] = turretImg
        }
        turretImg.onerror = () => {
          console.error(`[v0] Failed to load turret level ${level} sprite`)
        }
        turretImg.src = `/images/defenses/missile-level-${level}.jpeg`
      }
    }, [])

    useEffect(() => {
      const fetchHomeBaseData = async () => {
        if (!userIdProp) {
          console.log("[v0] No userId provided, skipping home base fetch")
          return
        }

        try {
          console.log("[v0] Fetching home base data for userId:", userIdProp)
          const response = await fetch(`/api/game/home-base/status?userId=${userIdProp}`)

          if (!response.ok) {
            console.error("[v0] Failed to fetch home base:", response.status)
            homeBaseDataRef.current = null
            return
          }

          const data = await response.json()
          console.log("[v0] Home base API response:", data)

          if (data.homeBase) {
            homeBaseDataRef.current = {
              x: data.homeBase.x,
              y: data.homeBase.y,
              world_id: data.homeBase.world_id,
              is_visible: data.homeBase.is_visible,
              user_id: data.homeBase.user_id,
              username: data.homeBase.username || "Unknown",
              alliance_id: data.homeBase.alliance_id || null,
            }
            console.log("[v0] Home base data set:", homeBaseDataRef.current)
          } else {
            console.log("[v0] No home base found in API response")
            homeBaseDataRef.current = null
          }
        } catch (error) {
          console.error("[v0] Error fetching home base:", error)
          homeBaseDataRef.current = null
        }
      }

      const fetchDefenseData = async () => {
        if (!userIdProp) {
          console.log("[v0] No userId for defense fetch")
          return
        }

        try {
          console.log("[v0] Fetching defense data for userId:", userIdProp)
          const response = await fetch(`/api/game/base-defenses/status?userId=${userIdProp}`)
          console.log("[v0] Defense API response status:", response.status)

          if (!response.ok) {
            const errorText = await response.text()
            console.error("[v0] Failed to fetch defense data:", response.status, errorText)
            return
          }

          const data = await response.json()
          console.log("[v0] Defense data response:", data)

          if (data.defenses) {
            console.log("[v0] Setting defenseData state:", data.defenses)
            setDefenseData(data.defenses)
          } else {
            console.log("[v0] No defenses found in API response, creating default")
            const defaultDefense = {
              defense_type: "missile",
              level: 1,
              count: 2,
              damage_multiplier: 1.0,
            }
            setDefenseData(defaultDefense)
          }
        } catch (error) {
          console.error("[v0] Error fetching defense data:", error)
          const defaultDefense = {
            defense_type: "missile",
            level: 1,
            count: 2,
            damage_multiplier: 1.0,
          }
          console.log("[v0] Setting default defenseData due to error:", defaultDefense)
          setDefenseData(defaultDefense)
        }
      }

      fetchHomeBaseData()
      fetchDefenseData()
    }, [userIdProp, currentMap])

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

    const getNameplateColor = (baseOwnerId: number, baseAllianceId: number | null): string => {
      if (baseOwnerId === userIdProp) {
        return "#22c55e" // Green for own base
      }
      if (baseAllianceId && baseAllianceId === allianceId) {
        return "#3b82f6" // Blue for alliance members
      }
      return "#ef4444" // Red for enemies
    }

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
            const screenX = (x - camera.x) * TILE_SIZE_PX * camera.zoom + ctx.canvas.width / 2
            const screenY = (y - camera.y) * TILE_SIZE_PX * camera.zoom + ctx.canvas.height / 2

            ctx.drawImage(grassTileRef.current, screenX, screenY, grassPngSizePx, grassPngSizePx)
          }
        }

        ctx.filter = "none"
      }

      if (homeBaseRef.current && homeBaseDataRef.current) {
        const homeBaseData = homeBaseDataRef.current

        if (homeBaseData.world_id === currentMap && homeBaseData.is_visible) {
          const baseTileX = homeBaseData.x
          const baseTileY = homeBaseData.y
          const baseWidth = 800 * camera.zoom
          const baseHeight = 600 * camera.zoom

          const screenX = (baseTileX - camera.x) * TILE_SIZE_PX * camera.zoom + ctx.canvas.width / 2 - baseWidth / 2
          const screenY = (baseTileY - camera.y) * TILE_SIZE_PX * camera.zoom + ctx.canvas.height / 2 - baseHeight / 2

          ctx.drawImage(homeBaseRef.current, screenX, screenY, baseWidth, baseHeight)

          if (defenseData && turretSpritesRef.current[defenseData.level]) {
            const turretSprite = turretSpritesRef.current[defenseData.level]

            if (turretSprite) {
              const now = Date.now()
              const animState = turretAnimationRef.current

              if (now >= animState.nextAnimationTime) {
                const frameRanges = [
                  [0, 5],
                  [6, 11],
                  [12, 17],
                  [18, 23],
                  [24, 29],
                  [30, 35],
                ]
                const randomRange = frameRanges[Math.floor(Math.random() * frameRanges.length)]
                animState.currentFrame =
                  randomRange[0] + Math.floor(Math.random() * (randomRange[1] - randomRange[0] + 1))
                animState.nextAnimationTime = now + 2000 + Math.random() * 3000
              }

              const turretSize = 40 * camera.zoom
              const gridCols = 5
              const gridSpacing = 60 * camera.zoom
              const gridOffsetX = screenX + baseWidth / 2 - (gridCols * gridSpacing) / 2
              const gridOffsetY = screenY + baseHeight * 0.85

              const currentFrame = animState.currentFrame
              const frameX = (currentFrame % 6) * (turretSprite.width / 6)
              const frameY = Math.floor(currentFrame / 6) * (turretSprite.height / 6)
              const frameWidth = turretSprite.width / 6
              const frameHeight = turretSprite.height / 6

              for (let i = 0; i < defenseData.count; i++) {
                const col = i % gridCols
                const row = Math.floor(i / gridCols)
                const turretX = gridOffsetX + col * gridSpacing
                const turretY = gridOffsetY + row * gridSpacing

                ctx.drawImage(
                  turretSprite,
                  frameX,
                  frameY,
                  frameWidth,
                  frameHeight,
                  turretX - turretSize / 2,
                  turretY - turretSize / 2,
                  turretSize,
                  turretSize,
                )
              }
            }
          }

          const nameplateY = screenY + baseHeight * 0.7 + 40 * camera.zoom
          const nameplateColor = getNameplateColor(homeBaseData.user_id, homeBaseData.alliance_id)

          ctx.font = `bold ${32 * camera.zoom}px Arial`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.letterSpacing = `${3 * camera.zoom}px`
          const displayName = homeBaseData.username.toUpperCase()
          const nameplateX = screenX + baseWidth / 2

          const extrusionDepth = 8
          const layerOffset = 1 * camera.zoom

          const parseColor = (hex: string) => {
            const r = Number.parseInt(hex.slice(1, 3), 16)
            const g = Number.parseInt(hex.slice(3, 5), 16)
            const b = Number.parseInt(hex.slice(5, 7), 16)
            return { r, g, b }
          }

          const rgb = parseColor(nameplateColor)
          const darkenFactor = 0.6
          const layerColor = `rgb(${Math.floor(rgb.r * darkenFactor)}, ${Math.floor(rgb.g * darkenFactor)}, ${Math.floor(rgb.b * darkenFactor)})`

          const frontFactor = 0.85
          const frontColor = `rgb(${Math.floor(rgb.r * frontFactor)}, ${Math.floor(rgb.g * frontFactor)}, ${Math.floor(rgb.b * frontFactor)})`

          ctx.lineWidth = 1.5 * camera.zoom
          ctx.strokeStyle = "rgba(0, 0, 0, 0.9)"

          for (let i = extrusionDepth; i > 0; i--) {
            const layerY = nameplateY - i * layerOffset
            ctx.strokeText(displayName, nameplateX, layerY)
            ctx.fillStyle = layerColor
            ctx.fillText(displayName, nameplateX, layerY)
          }

          ctx.strokeText(displayName, nameplateX, nameplateY)
          ctx.fillStyle = frontColor
          ctx.fillText(displayName, nameplateX, nameplateY)

          const textMetrics = ctx.measureText(displayName)
          const textWidth = textMetrics.width
          const textHeight = 32 * camera.zoom

          for (let i = 0; i < 50; i++) {
            const noiseX = nameplateX - textWidth / 2 + Math.random() * textWidth
            const noiseY = nameplateY - textHeight / 2 + Math.random() * textHeight
            const noiseSize = Math.random() * 2 * camera.zoom
            const noiseAlpha = Math.random() * 0.3

            ctx.fillStyle = `rgba(0, 0, 0, ${noiseAlpha})`
            ctx.fillRect(noiseX, noiseY, noiseSize, noiseSize)
          }
        } else {
          if (!window._lastBaseRenderLog || Date.now() - window._lastBaseRenderLog > 1000) {
            console.log(
              "[v0] Base not rendering - world_id:",
              homeBaseDataRef.current?.world_id,
              "currentMap:",
              currentMap,
              "is_visible:",
              homeBaseDataRef.current?.is_visible,
            )
            window._lastBaseRenderLog = Date.now()
          }
        }
      } else {
        if (!window._lastBaseRenderLog || Date.now() - window._lastBaseRenderLog > 1000) {
          console.log(
            "[v0] Base not rendering - homeBaseRef:",
            !!homeBaseRef.current,
            "homeBaseDataRef:",
            !!homeBaseDataRef.current,
          )
          window._lastBaseRenderLog = Date.now()
        }
      }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      if (e.button === 0) {
        // Left click
        const isOverBase = isMouseOverBase(x, y, gameState.camera)

        if (isOverBase) {
          setShowUpgradeMenu((prev) => !prev)
        } else {
          setShowUpgradeMenu(false)

          // Start selection box
          setGameState((prev) => ({
            ...prev,
            isSelecting: true,
            selectionBox: { start: { x, y }, end: { x, y } },
          }))
        }
      } else if (e.button === 2) {
        // Right click for dragging
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

      setMousePosition({ x, y })

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

    const isMouseOverBase = (
      mouseX: number,
      mouseY: number,
      camera: { x: number; y: number; zoom: number },
    ): boolean => {
      if (!homeBaseDataRef.current) {
        return false
      }

      const homeBaseData = homeBaseDataRef.current
      if (homeBaseData.world_id !== currentMap || !homeBaseData.is_visible) {
        return false
      }

      const baseTileX = homeBaseData.x
      const baseTileY = homeBaseData.y
      const baseWidth = 800 * camera.zoom
      const baseHeight = 600 * camera.zoom

      const screenX = (baseTileX - camera.x) * TILE_SIZE_PX * camera.zoom + canvasDimensions.width / 2 - baseWidth / 2
      const screenY = (baseTileY - camera.y) * TILE_SIZE_PX * camera.zoom + canvasDimensions.height / 2 - baseHeight / 2

      return mouseX >= screenX && mouseX <= screenX + baseWidth && mouseY >= screenY && mouseY <= screenY + baseHeight
    }

    const handleUpgrade = async (type: "count" | "level") => {
      if (!userIdProp) return

      try {
        const response = await fetch("/api/game/base-defenses/upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userIdProp,
            upgradeType: type,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          console.error("[v0] Upgrade failed:", error.error)
          return
        }

        const data = await response.json()
        if (data.defenses) {
          setDefenseData(data.defenses)
        }
      } catch (error) {
        console.error("[v0] Error upgrading defenses:", error)
      }
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

        {console.log("[v0] Render check - defenseData:", defenseData, "showUpgradeMenu:", showUpgradeMenu)}
        {homeBaseDataRef.current && (
          <BaseManagementMenu
            isVisible={showUpgradeMenu}
            onClose={() => setShowUpgradeMenu(false)}
            baseData={{
              userId: homeBaseDataRef.current.user_id,
              username: homeBaseDataRef.current.username,
              x: homeBaseDataRef.current.x,
              y: homeBaseDataRef.current.y,
            }}
            currentUserId={userIdProp || 0}
            defenseData={defenseData || { defense_type: "missile", level: 1, count: 2, damage_multiplier: 1.0 }}
            onUpgrade={handleUpgrade}
          />
        )}

        <Minimap
          camera={gameState.camera}
          canvasWidth={canvasDimensions.width}
          canvasHeight={canvasDimensions.height}
          currentMap={currentMap}
          onCameraMove={handleCameraMove}
          userId={userIdProp}
          username={username}
          allianceId={allianceId}
        />

        <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
          <div className="flex justify-center pointer-events-auto">
            <div className="bg-neutral-800/90 backdrop-blur-md border-b border-x border-amber-500 rounded-b-xl px-8 py-2 shadow-lg w-full flex justify-center">
              <button
                onClick={() => setShowFullMenu(true)}
                className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
                <span className="font-bold text-sm">MENU</span>
              </button>
            </div>
          </div>
        </div>

        {/* Full-page menu overlay */}
        <FullPageMenu
          isVisible={showFullMenu}
          onClose={() => setShowFullMenu(false)}
          currentMap={currentMap}
          onMapSelect={handleMapSelect}
        />
      </div>
    )
  },
)

GameCanvas.displayName = "GameCanvas"

export default GameCanvas
