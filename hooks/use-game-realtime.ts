"use client"

import { useEffect, useRef } from "react"
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
  const supabase = createClient()

  useEffect(() => {
    // Create a channel for this world
    const channel = supabase.channel(`game-world-${worldId}`)

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
          console.log("[v0] Units update:", payload)
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
          console.log("[v0] Buildings update:", payload)
          onBuildingsUpdate(payload)
        },
      )
    }

    // Subscribe to resources table changes (only user's own resources)
    if (onResourcesUpdate) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "resources",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[v0] Resources update:", payload)
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
          // Only notify if user is involved in the combat
          const record = payload.new as any
          if (record.attacker_id === userId || record.defender_id === userId) {
            console.log("[v0] Combat log:", payload)
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
          // Don't notify for user's own updates
          const record = payload.new as any
          if (record.user_id !== userId) {
            console.log("[v0] Game state update from other player:", payload)
            onGameStateUpdate(payload)
          }
        },
      )
    }

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[v0] Subscribed to real-time updates for world ${worldId}`)
      } else if (status === "CHANNEL_ERROR") {
        console.error(`[v0] Error subscribing to world ${worldId}`)
      } else if (status === "TIMED_OUT") {
        console.error(`[v0] Subscription timed out for world ${worldId}`)
      }
    })

    channelRef.current = channel

    // Cleanup on unmount or when worldId changes
    return () => {
      console.log(`[v0] Unsubscribing from world ${worldId}`)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [worldId, userId])

  return {
    isConnected: channelRef.current !== null,
  }
}
