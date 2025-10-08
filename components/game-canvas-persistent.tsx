"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import type { GameStateData } from "@/lib/types/game"
import { ChevronDown } from "lucide-react"

interface GameCanvasProps {
  initialState: GameStateData
  onStateChange: (state: GameStateData) => void
  worldId: string
  onMapChange: (mapId: number) => void // Changed from onOpenMapSelector to onMapChange
  currentMap: number
}

export default function GameCanvas({
  initialState,
  onStateChange,
  worldId,
  onMapChange, // Updated prop name
  currentMap,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameStateData>(initialState)
  const [showMapMenu, setShowMapMenu] = useState(false)
  const grassTileRef = useRef<HTMLImageElement | null>(null)

  const keysRef = useRef<Set<string>>(new Set())
  const gameStateRef = useRef(gameState)
  const animationFrameRef = useRef<number>()
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

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
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement
      const isTyping = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement

      // If user is typing, don't process WASD keys for camera movement
      if (isTyping) {
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
      const moveSpeed = 5
      let deltaX = 0
      let deltaY = 0

      if (keysRef.current.has("w") || keysRef.current.has("arrowup")) deltaY += moveSpeed
      if (keysRef.current.has("s") || keysRef.current.has("arrowdown")) deltaY -= moveSpeed
      if (keysRef.current.has("a") || keysRef.current.has("arrowleft")) deltaX += moveSpeed
      if (keysRef.current.has("d") || keysRef.current.has("arrowright")) deltaX -= moveSpeed

      if (deltaX !== 0 || deltaY !== 0) {
        setGameState((prev) => {
          const worldSize = 300
          const tileSize = 64
          const worldPixelSize = worldSize * tileSize
          const boundaryBuffer = 500

          const newX = prev.camera.x + deltaX
          const newY = prev.camera.y + deltaY

          const clampedX = Math.max(-worldPixelSize - boundaryBuffer, Math.min(worldPixelSize + boundaryBuffer, newX))
          const clampedY = Math.max(-worldPixelSize - boundaryBuffer, Math.min(worldPixelSize + boundaryBuffer, newY))

          return {
            ...prev,
            camera: {
              ...prev.camera,
              x: clampedX,
              y: clampedY,
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
    const tileSize = 64 * camera.zoom
    const tileWidth = tileSize
    const tileHeight = tileSize * 0.5

    const worldSize = 300

    const visibleTilesX = Math.ceil(ctx.canvas.width / tileWidth) + 2
    const visibleTilesY = Math.ceil(ctx.canvas.height / tileHeight) + 2

    const startX = Math.max(-worldSize, Math.floor(-camera.x / tileWidth) - visibleTilesX / 2)
    const endX = Math.min(worldSize, Math.ceil(-camera.x / tileWidth) + visibleTilesX / 2)
    const startY = Math.max(-worldSize, Math.floor(-camera.y / tileHeight) - visibleTilesY / 2)
    const endY = Math.min(worldSize, Math.ceil(-camera.y / tileHeight) + visibleTilesY / 2)

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const screenX = x * tileWidth + camera.x + ctx.canvas.width / 2
        const screenY = y * tileHeight + camera.y + ctx.canvas.height / 2

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
      const grassWidth = 512 * camera.zoom
      const grassHeight = 256 * camera.zoom

      const bufferTiles = 2
      const tilesX = Math.ceil(ctx.canvas.width / grassWidth) + bufferTiles * 2
      const tilesY = Math.ceil(ctx.canvas.height / grassHeight) + bufferTiles * 2

      const offsetX = ((camera.x % grassWidth) + grassWidth) % grassWidth
      const offsetY = ((camera.y % grassHeight) + grassHeight) % grassHeight
      const startScreenX = -grassWidth * bufferTiles + offsetX
      const startScreenY = -grassHeight * bufferTiles + offsetY

      for (let x = 0; x < tilesX; x++) {
        for (let y = 0; y < tilesY; y++) {
          const screenX = startScreenX + x * grassWidth
          const screenY = startScreenY + y * grassHeight
          ctx.drawImage(grassTileRef.current, screenX, screenY, grassWidth, grassHeight)
        }
      }
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

      setGameState((prev) => {
        const worldSize = 300
        const tileSize = 64
        const worldPixelSize = worldSize * tileSize
        const boundaryBuffer = 500

        const newX = prev.camera.x + deltaX
        const newY = prev.camera.y + deltaY

        const clampedX = Math.max(-worldPixelSize - boundaryBuffer, Math.min(worldPixelSize + boundaryBuffer, newX))
        const clampedY = Math.max(-worldPixelSize - boundaryBuffer, Math.min(worldPixelSize + boundaryBuffer, newY))

        return {
          ...prev,
          camera: {
            ...prev.camera,
            x: clampedX,
            y: clampedY,
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

  const totalMaps = 10
  const maps = Array.from({ length: totalMaps }, (_, i) => i + 1)

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

      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50">
        <div
          className="transition-transform duration-500 ease-out"
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
}
