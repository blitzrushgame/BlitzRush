"use client"

import { useEffect, useState } from "react"
import type { UnitType } from "@/lib/game/unit-constants"

interface Unit {
  id: number
  user_id: number
  world_id: number
  unit_type: UnitType
  x: number
  y: number
  health: number
  max_health: number
  attack: number
  defense: number
  movement_speed: number
  is_moving: boolean
  target_x: number | null
  target_y: number | null
  created_at: string
  updated_at: string
}

export function useUnits(worldId: number) {
  const [units, setUnits] = useState<Unit[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchUnits = async () => {
    try {
      const response = await fetch(`/api/game/units/list?worldId=${worldId}`)
      const data = await response.json()

      if (data.success) {
        setUnits(data.units)
      }
    } catch (error) {
      console.error("Error fetching units:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUnits()

    // Refresh units every 5 seconds
    const interval = setInterval(fetchUnits, 5000)

    return () => clearInterval(interval)
  }, [worldId])

  const trainUnit = async (unitType: UnitType, buildingId: number) => {
    try {
      const response = await fetch("/api/game/units/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worldId, unitType, buildingId }),
      })

      const data = await response.json()

      if (data.success) {
        // Units will appear after training completes
        // The game tick system will handle spawning
      }

      return data
    } catch (error) {
      console.error("Error training unit:", error)
      return { error: "Failed to train unit" }
    }
  }

  const spawnUnit = async (buildingId: number, unitType: UnitType, x: number, y: number) => {
    try {
      const response = await fetch("/api/game/units/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildingId, unitType, x, y }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchUnits()
      }

      return data
    } catch (error) {
      console.error("Error spawning unit:", error)
      return { error: "Failed to spawn unit" }
    }
  }

  return {
    units,
    isLoading,
    trainUnit,
    spawnUnit,
    refreshUnits: fetchUnits,
  }
}
