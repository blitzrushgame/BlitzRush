"use client"

import { useEffect, useRef } from "react"

interface APCPreviewProps {
  size?: number
}

export function APCPreview({ size = 90 }: APCPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const rotationRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Load APC spritesheet
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      imageRef.current = img
    }
    img.src = "/images/BlitzRushArt/BlitzRush_APC.png"

    const animate = () => {
      if (!imageRef.current) {
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

      // Draw APC
      ctx.drawImage(imageRef.current, sourceX, sourceY, frameWidth, frameHeight, 0, 0, canvas.width, canvas.height)

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
