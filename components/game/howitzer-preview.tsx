"use client"

import { useEffect, useRef } from "react"

interface HowitzerPreviewProps {
  size?: number
}

export function HowitzerPreview({ size = 90 }: HowitzerPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hullImageRef = useRef<HTMLImageElement | null>(null)
  const turretImageRef = useRef<HTMLImageElement | null>(null)
  const rotationRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Load hull spritesheet
    const hullImg = new Image()
    hullImg.crossOrigin = "anonymous"
    hullImg.onload = () => {
      hullImageRef.current = hullImg
    }
    hullImg.src = "/images/BlitzRushArt/BlitzRush_HowitzerHull.png"

    // Load turret spritesheet
    const turretImg = new Image()
    turretImg.crossOrigin = "anonymous"
    turretImg.onload = () => {
      turretImageRef.current = turretImg
    }
    turretImg.src = "/images/BlitzRushArt/BlitzRush_HowitzerTurret.png"

    const animate = () => {
      if (!hullImageRef.current || !turretImageRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const frameCount = 72
      const frameWidth = 512
      const frameHeight = 512
      const currentFrame = Math.floor(rotationRef.current) % frameCount

      const sourceX = currentFrame * frameWidth
      const sourceY = 0

      // Draw hull
      ctx.drawImage(hullImageRef.current, sourceX, sourceY, frameWidth, frameHeight, 0, 0, canvas.width, canvas.height)

      // Draw turret
      ctx.drawImage(
        turretImageRef.current,
        sourceX,
        sourceY,
        frameWidth,
        frameHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      )

      rotationRef.current = (rotationRef.current + 0.5) % frameCount
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return <canvas ref={canvasRef} width={size} height={size} className="w-full h-full object-contain" />
}
