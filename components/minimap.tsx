"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"

interface MinimapProps {
  camera: { x: number; y: number; zoom: number }
  canvasWidth: number
  canvasHeight: number
  currentMap: number
  onCameraMove: (x: number, y: number) => void
  userId: number | null
  username: string
  allianceId: number | null
}

export default function Minimap({
  camera,
  canvasWidth,
  canvasHeight,
  currentMap,
  onCameraMove,
  userId,
  username,
  allianceId,
}: MinimapProps) {
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const [homeBaseLocation, setHomeBaseLocation] = useState<{ x: number; y: number } | null>(null)

  const worldSize = 300
  const tileSize = 64
  const worldPixelSize = worldSize * tileSize
  const minimapSize = 250

  useEffect(() => {
    const fetchHomeBase = async () => {
      if (!userId) return

      try {
        const response = await fetch(`/api/game/home-base/status?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.homeBase && data.homeBase.world_id === currentMap) {
            setHomeBaseLocation({ x: data.homeBase.x, y: data.homeBase.y })
          } else {
            setHomeBaseLocation(null)
          }
        }
      } catch (error) {
        console.error("[v0] Error fetching home base for minimap:", error)
      }
    }

    fetchHomeBase()
    const interval = setInterval(fetchHomeBase, 5000)
    return () => clearInterval(interval)
  }, [currentMap, userId])

  useEffect(() => {
    const canvas = minimapRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, minimapSize, minimapSize)

    const scale = minimapSize / (worldPixelSize * 2)

    if (homeBaseLocation) {
      const minimapCenterX = minimapSize / 2
      const minimapCenterY = minimapSize / 2

      const homeBaseMinimapX = minimapCenterX - homeBaseLocation.x * scale
      const homeBaseMinimapY = minimapCenterY - homeBaseLocation.y * scale

      ctx.fillStyle = "#00ff00"
      ctx.beginPath()
      ctx.arc(homeBaseMinimapX, homeBaseMinimapY, 6, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.stroke()
    }

    const viewportWidth = canvasWidth / camera.zoom
    const viewportHeight = canvasHeight / camera.zoom

    const minimapCenterX = minimapSize / 2
    const minimapCenterY = minimapSize / 2

    const viewportX = minimapCenterX - camera.x * scale - (viewportWidth * scale) / 2
    const viewportY = minimapCenterY - camera.y * scale - (viewportHeight * scale) / 2
    const viewportW = viewportWidth * scale
    const viewportH = viewportHeight * scale

    ctx.strokeStyle = "#00ff00"
    ctx.lineWidth = 1
    ctx.strokeRect(viewportX, viewportY, viewportW, viewportH)

    ctx.fillStyle = "rgba(0, 255, 0, 0.1)"
    ctx.fillRect(viewportX, viewportY, viewportW, viewportH)
  }, [camera, canvasWidth, canvasHeight, minimapSize, worldPixelSize, homeBaseLocation])

  const totalWorldRange = worldPixelSize * 2
  const displayRange = 2000

  const horizontalCoord = Math.round(((worldPixelSize - camera.x) / totalWorldRange) * displayRange)
  const verticalCoord = Math.round(((worldPixelSize - camera.y) / totalWorldRange) * displayRange)

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = minimapRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()

    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

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
