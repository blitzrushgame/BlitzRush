import type { SupabaseClient } from "@supabase/supabase-js"

export interface BaseClaimListener {
  stop: () => void
}

/**
 * Listen for base claims in real-time and trigger immediate actions
 * When a base is claimed, check if dynamic spawning is needed
 */
export function setupBaseClaimListener(
  supabase: SupabaseClient,
  worldId: number,
  onBaseClaimed?: (data: any) => void,
): BaseClaimListener {
  const channel = supabase
    .channel(`world:${worldId}:bases`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "buildings",
        filter: `world_id=eq.${worldId}`,
      },
      async (payload) => {
        // A base was just claimed
        if (payload.new.user_id && !payload.old.user_id) {
          console.log(`[Realtime] Base ${payload.new.id} claimed by user ${payload.new.user_id}`)

          // Record the claim event
          await supabase.from("world_metrics").insert({
            world_id: worldId,
            timestamp: new Date().toISOString(),
          })

          // Trigger callback if provided
          if (onBaseClaimed) {
            onBaseClaimed(payload.new)
          }

          // Check if we need to spawn bases immediately
          await checkAndSpawnBasesIfNeeded(supabase, worldId)
        }
      },
    )
    .subscribe((status) => {
      console.log(`[Realtime] Base claim channel status: ${status}`)
    })

  return {
    stop: () => {
      channel.unsubscribe()
    },
  }
}

/**
 * Check current world metrics and spawn bases if thresholds are hit
 */
async function checkAndSpawnBasesIfNeeded(supabase: SupabaseClient, worldId: number) {
  try {
    // Get world info
    const { data: world } = await supabase.from("worlds").select("id, status").eq("id", worldId).single()

    if (!world || world.status !== "active") {
      return
    }

    // Count bases and get metrics
    const { count: totalBases } = await supabase
      .from("buildings")
      .select("id", { count: "exact" })
      .eq("world_id", worldId)

    const { count: claimedBases } = await supabase
      .from("buildings")
      .select("id", { count: "exact" })
      .eq("world_id", worldId)
      .not("user_id", "is", null)

    if (!totalBases) return

    const unclaimed = totalBases - (claimedBases || 0)
    const targetUnclaimedCount = Math.ceil(totalBases * 0.15) // Keep 15% unclaimed

    console.log(`[Realtime] World ${worldId}: ${unclaimed}/${targetUnclaimedCount} unclaimed bases`)

    // If unclaimed falls below threshold, spawn immediately
    if (unclaimed < targetUnclaimedCount) {
      const basesToSpawn = Math.ceil(targetUnclaimedCount - unclaimed)
      console.log(`[Realtime] Spawning ${basesToSpawn} bases immediately on World ${worldId}`)

      // Trigger spawn event (actual spawning handled by separate endpoint)
      await supabase.from("base_spawn_events").insert({
        world_id: worldId,
        bases_spawned: basesToSpawn,
        trigger_reason: "dynamic_scaling",
        metrics_snapshot: { unclaimed, targetUnclaimedCount },
      })

      // Call the spawn endpoint
      await fetch("/api/admin/spawn-bases-immediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worldId, basesToSpawn }),
      })
    }
  } catch (error) {
    console.error("[Realtime] Error checking bases:", error)
  }
}

/**
 * Listen for world status changes (escalation trigger, world closing)
 */
export function setupWorldStatusListener(
  supabase: SupabaseClient,
  worldId: number,
  onStatusChange?: (status: string) => void,
): BaseClaimListener {
  const channel = supabase
    .channel(`world:${worldId}:status`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "worlds",
        filter: `id=eq.${worldId}`,
      },
      async (payload) => {
        const oldStatus = payload.old.status
        const newStatus = payload.new.status

        console.log(`[Realtime] World ${worldId} status changed: ${oldStatus} → ${newStatus}`)

        if (onStatusChange) {
          onStatusChange(newStatus)
        }

        // Handle escalation trigger
        if (newStatus === "escalation" && oldStatus === "active") {
          console.log(`[Realtime] World ${worldId} escalated. Starting 24h timer.`)
          // Could emit event to UI to show timer
        }

        // Handle world closure
        if (newStatus === "closed" && oldStatus === "escalation") {
          console.log(`[Realtime] World ${worldId} closed. New world should be live.`)
          // Could redirect players or show notification
        }
      },
    )
    .subscribe((status) => {
      console.log(`[Realtime] World status channel: ${status}`)
    })

  return {
    stop: () => {
      channel.unsubscribe()
    },
  }
}

/**
 * Listen for new base spawns across the map (for UI updates)
 */
export function setupBaseSpawnListener(
  supabase: SupabaseClient,
  worldId: number,
  onBasesSpawned?: (bases: any[]) => void,
): BaseClaimListener {
  const channel = supabase
    .channel(`world:${worldId}:spawns`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "buildings",
        filter: `world_id=eq.${worldId}`,
      },
      (payload) => {
        console.log(`[Realtime] New base spawned at (${payload.new.x}, ${payload.new.y})`)

        if (onBasesSpawned) {
          onBasesSpawned([payload.new])
        }
      },
    )
    .subscribe((status) => {
      console.log(`[Realtime] Base spawn channel: ${status}`)
    })

  return {
    stop: () => {
      channel.unsubscribe()
    },
  }
}
