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
  const [isConnected, setIsConnected] = useState(false)
  const retryCountRef = useRef(0)
  const maxRetries = 3
  const supabase = createClient()

  useEffect(() => {
    const setupRealtimeSubscription = () => {
      const channel = supabase.channel(`game-world-${worldId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: userId.toString() },
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
            console.log("[v0] Units update received:", payload.eventType)
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
            console.log("[v0] Buildings update received:", payload.eventType)
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
            console.log("[v0] Resources update received")
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
              console.log("[v0] Combat log received")
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
          retryCountRef.current = 0
        } else if (status === "CHANNEL_ERROR") {
          console.warn(`[v0] Realtime connection error for world ${worldId}. Retrying...`)
          setIsConnected(false)

          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++
            console.log(`[v0] Retrying realtime connection (${retryCountRef.current}/${maxRetries})...`)
            setTimeout(() => {
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
              }
              setupRealtimeSubscription()
            }, 2000 * retryCountRef.current)
          }
        } else if (status === "TIMED_OUT") {
          console.warn(`[v0] Realtime subscription timed out for world ${worldId}. Check Supabase realtime settings.`)
          setIsConnected(false)
        }
      })

      channelRef.current = channel
    }

    setupRealtimeSubscription()

    return () => {
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
