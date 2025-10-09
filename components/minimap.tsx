"use client"

import type React from "react"
import { useEffect, useRef } from "react"

interface MinimapProps {
  camera: { x: number; y: number; zoom: number }
  canvasWidth: number
  canvasHeight: number
  currentMap: number
  onCameraMove: (x: number, y: number) => void
}

export default function Minimap({ camera, canvasWidth, canvasHeight, currentMap, onCameraMove }: MinimapProps) {
  const minimapRef = useRef<HTMLCanvasElement>(null)

  const worldSize = 300
  const tileSize = 64
  const worldPixelSize = worldSize * tileSize
  const minimapSize = 250

  useEffect(() => {
    const canvas = minimapRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, minimapSize, minimapSize)

    // Scale factor to fit world into minimap
    const scale = minimapSize / (worldPixelSize * 2)

    // Draw grid pattern
    ctx.strokeStyle = "#333333"
    ctx.lineWidth = 0.5
    const gridSize = 10
    for (let i = 0; i <= minimapSize; i += gridSize) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, minimapSize)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(minimapSize, i)
      ctx.stroke()
    }

    // Draw viewport rectangle
    const viewportWidth = canvasWidth / camera.zoom
    const viewportHeight = canvasHeight / camera.zoom

    const minimapCenterX = minimapSize / 2
    const minimapCenterY = minimapSize / 2

    const viewportX = minimapCenterX - camera.x * scale - (viewportWidth * scale) / 2
    const viewportY = minimapCenterY - camera.y * scale - (viewportHeight * scale) / 2
    const viewportW = viewportWidth * scale
    const viewportH = viewportHeight * scale

    // Draw viewport rectangle
    ctx.strokeStyle = "#00ff00"
    ctx.lineWidth = 1 // Reduced line width from 2 to 1 to make the viewport box thinner
    ctx.strokeRect(viewportX, viewportY, viewportW, viewportH)

    // Draw viewport fill
    ctx.fillStyle = "rgba(0, 255, 0, 0.1)"
    ctx.fillRect(viewportX, viewportY, viewportW, viewportH)
  }, [camera, canvasWidth, canvasHeight, minimapSize, worldPixelSize])

  // World spans from -worldPixelSize to +worldPixelSize (total range: 2 * worldPixelSize)
  // Map this to 0:2000 range
  const totalWorldRange = worldPixelSize * 2 // Total pixels in world
  const displayRange = 2000 // Display range 0-2000

  // Convert camera position to 0-2000 coordinates
  // Camera at -worldPixelSize (top-left) should show 0:0
  // Camera at +worldPixelSize (bottom-right) should show 2000:2000
  const horizontalCoord = Math.round(((worldPixelSize - camera.x) / totalWorldRange) * displayRange)
  const verticalCoord = Math.round(((worldPixelSize - camera.y) / totalWorldRange) * displayRange)

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = minimapRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()

    // Get click position relative to canvas
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    // Convert minimap coordinates to world coordinates
    const scale = minimapSize / (worldPixelSize * 2)
    const minimapCenterX = minimapSize / 2
    const minimapCenterY = minimapSize / 2

    const worldX = -(clickX - minimapCenterX) / scale
    const worldY = -(clickY - minimapCenterY) / scale

    onCameraMove(worldX, worldY)
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-fit pointer-events-none">
      <div className="bg-black/90 border-2 border-amber-500/50 rounded-lg shadow-2xl p-2 pointer-events-auto">
        <div className="flex justify-between items-center px-2 mb-1">
          <span className="text-amber-400 font-bold text-sm">MAP {currentMap}</span>
          <span className="text-amber-400 font-bold text-sm">
            {horizontalCoord}:{verticalCoord}
          </span>
        </div>

        <canvas
          ref={minimapRef}
          width={minimapSize}
          height={minimapSize}
          onClick={handleCanvasClick}
          className="block cursor-pointer rounded border border-amber-500/30"
          style={{
            width: `${minimapSize}px`,
            height: `${minimapSize}px`,
          }}
        />
      </div>
    </div>
  )
}
