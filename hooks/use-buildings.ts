"use client"

import { useEffect, useState } from "react"
import type { BuildingType } from "@/lib/game/building-constants"

interface Building {
  id: number
  user_id: number
  world_id: number
  building_type: BuildingType
  x: number
  y: number
  level: number
  health: number
  max_health: number
  production_queue: any[]
  isUnderConstruction: boolean
  isUpgrading: boolean
  activeProduction: any
  created_at: string
  updated_at: string
}

export function useBuildings(worldId: number) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchBuildings = async () => {
    try {
      const response = await fetch(`/api/game/buildings/list?worldId=${worldId}`)
      const data = await response.json()

      if (data.success) {
        setBuildings(data.buildings)
      }
    } catch (error) {
      console.error("Error fetching buildings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBuildings()

    // Refresh buildings every 10 seconds
    const interval = setInterval(fetchBuildings, 10000)

    return () => clearInterval(interval)
  }, [worldId])

  const constructBuilding = async (buildingType: BuildingType, x: number, y: number) => {
    try {
      const response = await fetch("/api/game/buildings/construct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worldId, buildingType, x, y }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchBuildings()
      }

      return data
    } catch (error) {
      console.error("Error constructing building:", error)
      return { error: "Failed to construct building" }
    }
  }

  const upgradeBuilding = async (buildingId: number) => {
    try {
      const response = await fetch("/api/game/buildings/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildingId }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchBuildings()
      }

      return data
    } catch (error) {
      console.error("Error upgrading building:", error)
      return { error: "Failed to upgrade building" }
    }
  }

  return {
    buildings,
    isLoading,
    constructBuilding,
    upgradeBuilding,
    refreshBuildings: fetchBuildings,
  }
}
