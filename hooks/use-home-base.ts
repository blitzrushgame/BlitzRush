import useSWR, { mutate } from "swr"

interface HomeBase {
  id: number
  user_id: number
  world_id: number
  x: number
  y: number
  building_type: string
  base_type: string
  is_home_base: boolean
  owner_username: string
  level: number
  health: number
  max_health: number
  turret_count: number
  factory_level: number
  created_at: string
  updated_at: string
}

interface HomeBaseStatus {
  homeBase: HomeBase | null
  hasHomeBase: boolean
  canRelocate: boolean
  otherBasesCount: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useHomeBase(userId: number | null) {
  const { data, error, isLoading } = useSWR<HomeBaseStatus>(
    userId ? `/api/game/home-base/status?userId=${userId}` : null,
    fetcher,
    { refreshInterval: 5000 },
  )

  const createHomeBase = async (worldId: number, x: number, y: number) => {
    const response = await fetch("/api/game/home-base/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, worldId, x, y }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to create home base")
    }

    const result = await response.json()
    mutate(`/api/game/home-base/status?userId=${userId}`)
    return result.homeBase
  }

  const relocateHomeBase = async (newWorldId: number, x: number, y: number) => {
    const response = await fetch("/api/game/home-base/relocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, newWorldId, x, y }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to relocate home base")
    }

    const result = await response.json()
    mutate(`/api/game/home-base/status?userId=${userId}`)
    return result.homeBase
  }

  const handleDestruction = async (choice: "relocate" | "reset") => {
    const response = await fetch("/api/game/home-base/destroy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, choice }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to handle destruction")
    }

    const result = await response.json()
    mutate(`/api/game/home-base/status?userId=${userId}`)
    return result
  }

  return {
    homeBase: data?.homeBase || null,
    hasHomeBase: data?.hasHomeBase || false,
    canRelocate: data?.canRelocate || false,
    otherBasesCount: data?.otherBasesCount || 0,
    isLoading,
    error,
    createHomeBase,
    relocateHomeBase,
    handleDestruction,
  }
}
