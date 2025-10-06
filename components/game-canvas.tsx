"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"

interface GameState {
  camera: {
    x: number
    y: number
    zoom: number
  }
  isDragging: boolean
  isSelecting: boolean
  dragStart: { x: number; y: number } | null
  selectionBox: {
    start: { x: number; y: number } | null
    end: { x: number; y: number } | null
  }
  selectedUnits: Array<{ x: number; y: number; id: string; type: string }>
  keys: Set<string>
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>({
    camera: { x: 0, y: 0, zoom: 2 },
    isDragging: false,
    isSelecting: false,
    dragStart: null,
    selectionBox: { start: null, end: null },
    selectedUnits: [],
    keys: new Set(),
  })

  const keysRef = useRef<Set<string>>(new Set())
  const gameStateRef = useRef(gameState)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const handleKeyDown = (e: KeyboardEvent) => {
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
          const worldSize = 15
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

      // Clear canvas with military grey background
      ctx.fillStyle = "#2a2a2a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const currentState = gameStateRef.current

      // Draw terrain tiles
      drawIsometricTerrain(ctx, currentState.camera)

      // Draw selection box
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
  }, []) // Remove gameState dependency to prevent multiple loops

  const drawIsometricTerrain = (ctx: CanvasRenderingContext2D, camera: { x: number; y: number; zoom: number }) => {
    const tileSize = 64 * camera.zoom
    const tileWidth = tileSize
    const tileHeight = tileSize * 0.5

    const worldSize = 15

    const centerX = ctx.canvas.width / 2 + camera.x
    const centerY = ctx.canvas.height / 2 + camera.y

    // Calculate visible tile range
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

        // Create terrain variation based on position
        const terrainType = (x + y) % 3
        let tileColor = "#4a4a4a" // Default grey

        if (terrainType === 0)
          tileColor = "#3a4a3a" // Darker green-grey
        else if (terrainType === 1)
          tileColor = "#4a3a3a" // Brown-grey
        else tileColor = "#4a4a4a" // Standard grey

        // Draw isometric tile
        ctx.fillStyle = tileColor
        ctx.beginPath()
        ctx.moveTo(screenX, screenY)
        ctx.lineTo(screenX + tileWidth / 2, screenY + tileHeight / 2)
        ctx.lineTo(screenX, screenY + tileHeight)
        ctx.lineTo(screenX - tileWidth / 2, screenY + tileHeight / 2)
        ctx.closePath()
        ctx.fill()

        // Add tile borders
        ctx.strokeStyle = "#666666"
        ctx.lineWidth = 0.5
        ctx.stroke()
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
      // Right click - camera drag
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
      // Update selection box
      setGameState((prev) => ({
        ...prev,
        selectionBox: { ...prev.selectionBox, end: { x, y } },
      }))
    } else if (gameState.isDragging && gameState.dragStart) {
      // Update camera position
      const deltaX = x - gameState.dragStart.x
      const deltaY = y - gameState.dragStart.y

      setGameState((prev) => {
        const worldSize = 15
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
    if (gameState.isSelecting && gameState.selectionBox.start && gameState.selectionBox.end) {
      setGameState((prev) => ({
        ...prev,
        selectedUnits: [], // No units to select
        isDragging: false,
        isSelecting: false,
        dragStart: null,
        selectionBox: { start: null, end: null },
      }))
    } else {
      setGameState((prev) => ({
        ...prev,
        isDragging: false,
        isSelecting: false,
        dragStart: null,
        selectionBox: { start: null, end: null },
      }))
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    // Zoom functionality removed - camera stays at 2x
  }

  const drawSelectionBox = (
    ctx: CanvasRenderingContext2D,
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) => {
    const width = end.x - start.x
    const height = end.y - start.y

    // Fill with semi-transparent background
    ctx.fillStyle = "rgba(0, 255, 0, 0.1)"
    ctx.fillRect(start.x, start.y, width, height)

    // Draw animated border
    ctx.strokeStyle = "#00ff00"
    ctx.lineWidth = 2
    ctx.setLineDash([8, 4])
    ctx.lineDashOffset = -(Date.now() / 50) % 12 // Animated dashes
    ctx.strokeRect(start.x, start.y, width, height)
    ctx.setLineDash([])
  }

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        tabIndex={0}
      />

      <div className="absolute top-4 left-4 text-green-400 bg-black/80 p-4 rounded border border-green-600/50">
        <div className="text-lg font-bold text-amber-400 mb-2">BLITZ RUSH - Command Center</div>
        <div>
          Camera: ({Math.round(gameState.camera.x)}, {Math.round(gameState.camera.y)})
        </div>
        <div>Selected Units: {gameState.selectedUnits.length}</div>
        <div className="text-xs mt-3 space-y-1 text-green-300">
          <div>WASD/Arrow Keys: Move camera</div>
          <div>Left click + drag: Select units</div>
          <div>Right click + drag: Pan camera</div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 w-48 h-32 bg-black/80 border border-green-600/50 rounded">
        <div className="text-green-400 text-xs p-2 border-b border-green-600/30">TACTICAL MAP</div>
        <div className="p-2 text-green-300 text-xs">Minimap coming soon...</div>
      </div>
    </div>
  )
}
