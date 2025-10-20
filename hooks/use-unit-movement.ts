"use client"

import { useCallback } from "react"

export function useUnitMovement() {
  const moveUnit = useCallback(async (unitId: number, targetX: number, targetY: number) => {
    try {
      const response = await fetch("/api/game/units/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId, targetX, targetY }),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error moving unit:", error)
      return { error: "Failed to move unit" }
    }
  }, [])

  const stopUnit = useCallback(async (unitId: number) => {
    try {
      const response = await fetch("/api/game/units/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId }),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error stopping unit:", error)
      return { error: "Failed to stop unit" }
    }
  }, [])

  const updatePosition = useCallback(async (unitId: number, newX: number, newY: number) => {
    try {
      const response = await fetch("/api/game/units/update-position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId, newX, newY }),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error updating position:", error)
      return { error: "Failed to update position" }
    }
  }, [])

  return {
    moveUnit,
    stopUnit,
    updatePosition,
  }
}
