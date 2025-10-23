"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface GameRealtimeOptions {
  worldId: number
  userId: number
  onUnitsUpdate?: (payload: any) => void
  onBuildingsUpdate?: (payload: any) => void
  onResourcesUpdate?: (payload: any) => void
  onCombatLog?: (payload: any) => void
  onGameStateUpdate?: (payload: any) => void
}

export function useGameRealtime({
  worldId,
  userId,
  onUnitsUpdate,
  onBuildingsUpdate,
  onResourcesUpdate,
  onCombatLog,
  onGameStateUpdate,
}: GameRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const resourceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const retryCountRef = useRef(0)
  const maxRetries = 3
  const supabase = createClient()

  useEffect(() => {
    const generateResources = async () => {
      try {
        const response = await fetch("/api/game/resources/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, worldId }),
        })

        if (response.ok) {
          const data = await response.json()
          // Resources generated successfully (silent)
        } else if (response.status === 429) {
          // Rate limited, this is expected (silent)
        }
      } catch (error) {
        console.error("[v0] Error generating resources:", error)
      }
    }

    // Start resource generation immediately, then every 5 seconds
    generateResources()
    resourceIntervalRef.current = setInterval(generateResources, 5000)

    const setupRealtimeSubscription = () => {
      const channel = supabase.channel(`game-world-${worldId}`, {
        config: {
          broadcast: { self: true },
        },
      })

      // Subscribe to units table changes
      if (onUnitsUpdate) {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "units",
            filter: `world_id=eq.${worldId}`,
          },
          (payload) => {
            onUnitsUpdate(payload)
          },
        )
      }

      // Subscribe to buildings table changes
      if (onBuildingsUpdate) {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "buildings",
            filter: `world_id=eq.${worldId}`,
          },
          (payload) => {
            onBuildingsUpdate(payload)
          },
        )
      }

      if (onResourcesUpdate) {
        channel.on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_game_states",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            onResourcesUpdate(payload)
          },
        )
      }

      // Subscribe to combat logs (where user is involved)
      if (onCombatLog) {
        channel.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "combat_logs",
            filter: `world_id=eq.${worldId}`,
          },
          (payload) => {
            const record = payload.new as any
            if (record.attacker_id === userId || record.defender_id === userId) {
              onCombatLog(payload)
            }
          },
        )
      }

      // Subscribe to game state changes from other players
      if (onGameStateUpdate) {
        channel.on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_game_states",
            filter: `world_id=eq.${worldId}`,
          },
          (payload) => {
            const record = payload.new as any
            if (record.user_id !== userId) {
              onGameStateUpdate(payload)
            }
          },
        )
      }

      // Subscribe to the channel with improved error handling
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[v0] Realtime connected for world ${worldId}`)
          setIsConnected(true)
          retryCountRef.current = 0 // Reset retry count on success
        } else if (status === "CHANNEL_ERROR") {
          console.warn(`[v0] Realtime connection error for world ${worldId}. Game will continue using polling.`)
          setIsConnected(false)

          // Retry if we haven't exceeded max retries
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++
            console.log(`[v0] Retrying realtime connection (${retryCountRef.current}/${maxRetries})...`)
            setTimeout(() => {
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
              }
              setupRealtimeSubscription()
            }, 2000 * retryCountRef.current) // Exponential backoff
          }
        } else if (status === "TIMED_OUT") {
          console.warn(`[v0] Realtime subscription timed out for world ${worldId}. Game will continue using polling.`)
          setIsConnected(false)

          // Don't retry on timeout - it's likely a configuration issue
          // The game will continue to work via polling
        }
      })

      channelRef.current = channel
    }

    setupRealtimeSubscription()

    // Cleanup on unmount or when worldId changes
    return () => {
      if (resourceIntervalRef.current) {
        clearInterval(resourceIntervalRef.current)
        resourceIntervalRef.current = null
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      setIsConnected(false)
      retryCountRef.current = 0
    }
  }, [worldId, userId])

  return {
    isConnected,
  }
}
