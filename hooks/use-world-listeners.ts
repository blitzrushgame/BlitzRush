"use client"

import { useEffect, useRef } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  setupBaseClaimListener,
  setupWorldStatusListener,
  setupBaseSpawnListener,
  type BaseClaimListener,
} from "@/lib/supabase/realtime-listeners"

export interface WorldListenersConfig {
  worldId: number
  onBaseClaimed?: (base: any) => void
  onStatusChange?: (status: string) => void
  onBasesSpawned?: (bases: any[]) => void
}

/**
 * Hook to setup all real-time listeners for a world
 * Automatically cleans up on unmount
 */
export function useWorldListeners(supabase: SupabaseClient, config: WorldListenersConfig) {
  const listeners = useRef<BaseClaimListener[]>([])

  useEffect(() => {
    if (!supabase || !config.worldId) return

    console.log(`[useWorldListeners] Setting up listeners for World ${config.worldId}`)

    // Setup all listeners
    const claimListener = setupBaseClaimListener(supabase, config.worldId, config.onBaseClaimed)
    const statusListener = setupWorldStatusListener(supabase, config.worldId, config.onStatusChange)
    const spawnListener = setupBaseSpawnListener(supabase, config.worldId, config.onBasesSpawned)

    listeners.current = [claimListener, statusListener, spawnListener]

    // Cleanup function
    return () => {
      console.log(`[useWorldListeners] Cleaning up listeners for World ${config.worldId}`)
      listeners.current.forEach((listener) => listener.stop())
      listeners.current = []
    }
  }, [supabase, config.worldId])
}
