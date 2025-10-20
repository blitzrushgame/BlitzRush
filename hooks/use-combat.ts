"use client"

import { useCallback, useEffect, useState } from "react"

interface CombatLog {
  id: number
  world_id: number
  attacker_id: number
  defender_id: number
  result: any
  created_at: string
}

export function useCombat(worldId: number) {
  const [combatLogs, setCombatLogs] = useState<CombatLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchCombatLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/game/combat/logs?worldId=${worldId}&limit=50`)
      const data = await response.json()

      if (data.success) {
        setCombatLogs(data.logs)
      }
    } catch (error) {
      console.error("Error fetching combat logs:", error)
    } finally {
      setIsLoading(false)
    }
  }, [worldId])

  useEffect(() => {
    fetchCombatLogs()

    // Refresh logs every 10 seconds
    const interval = setInterval(fetchCombatLogs, 10000)

    return () => clearInterval(interval)
  }, [fetchCombatLogs])

  const attackUnit = useCallback(
    async (attackerUnitId: number, defenderUnitId: number) => {
      try {
        const response = await fetch("/api/game/combat/attack-unit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attackerUnitId, defenderUnitId }),
        })

        const data = await response.json()

        if (data.success) {
          await fetchCombatLogs()
        }

        return data
      } catch (error) {
        console.error("Error attacking unit:", error)
        return { error: "Failed to attack unit" }
      }
    },
    [fetchCombatLogs],
  )

  const attackBuilding = useCallback(
    async (attackerUnitId: number, targetBuildingId: number) => {
      try {
        const response = await fetch("/api/game/combat/attack-building", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attackerUnitId, targetBuildingId }),
        })

        const data = await response.json()

        if (data.success) {
          await fetchCombatLogs()
        }

        return data
      } catch (error) {
        console.error("Error attacking building:", error)
        return { error: "Failed to attack building" }
      }
    },
    [fetchCombatLogs],
  )

  return {
    combatLogs,
    isLoading,
    attackUnit,
    attackBuilding,
    refreshLogs: fetchCombatLogs,
  }
}
