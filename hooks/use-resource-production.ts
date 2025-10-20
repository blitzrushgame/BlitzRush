"use client"

import { useEffect, useState } from "react"
import type { ResourceProduction } from "@/lib/game/resource-production"

export function useResourceProduction(worldId: number) {
  const [productionRates, setProductionRates] = useState<ResourceProduction | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProductionRates = async () => {
      try {
        const response = await fetch(`/api/game/resources/production?worldId=${worldId}`)
        const data = await response.json()

        if (data.success) {
          setProductionRates(data.productionRates)
        }
      } catch (error) {
        console.error("Error fetching production rates:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProductionRates()

    // Refresh production rates every 5 minutes
    const interval = setInterval(fetchProductionRates, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [worldId])

  const applyProduction = async () => {
    try {
      const response = await fetch("/api/game/resources/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worldId }),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error applying production:", error)
      return null
    }
  }

  return {
    productionRates,
    isLoading,
    applyProduction,
  }
}
