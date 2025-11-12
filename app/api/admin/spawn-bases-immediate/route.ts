import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Handle error
        }
      },
    },
  })
}

/**
 * Spawns bases immediately when real-time triggers detect low unclaimed count
 * This runs instantly rather than waiting for 5-minute cron job
 */
export async function POST(req: NextRequest) {
  try {
    const { worldId, basesToSpawn } = await req.json()

    if (!worldId || !basesToSpawn) {
      return NextResponse.json({ error: "worldId and basesToSpawn are required" }, { status: 400 })
    }

    const supabase = await getSupabaseClient()

    // Get world info
    const { data: world } = await supabase.from("worlds").select("id, status, map_size").eq("id", worldId).single()

    if (!world) {
      return NextResponse.json({ error: "World not found" }, { status: 404 })
    }

    // Get current base zones for this world
    const { data: zones } = await supabase.from("world_base_zones").select("*").eq("world_id", worldId)

    if (!zones || zones.length === 0) {
      return NextResponse.json({ error: "No base zones found" }, { status: 404 })
    }

    // Identify high-priority zones (where bases are being claimed fastest)
    const priorityZones = zones.sort((a, b) => {
      // Prefer zones with higher claim density
      return b.center_y - a.center_y
    })

    // Generate bases in priority zones using Poisson disk sampling
    const basesToCreate = []
    const minDistance = 60

    for (const zone of priorityZones) {
      if (basesToCreate.length >= basesToSpawn) break

      const baseCount = Math.min(Math.ceil(basesToSpawn / priorityZones.length), basesToSpawn - basesToCreate.length)

      const positions = poissonDiskSamplingInZone(zone.center_x, zone.center_y, zone.radius, baseCount, minDistance)

      for (const pos of positions) {
        basesToCreate.push({
          world_id: worldId,
          x: pos.x,
          y: pos.y,
          base_type: zone.zone_type === "standard" ? "command_center" : "outpost",
          base_specialization: zone.specialization || "ground",
          level: 1,
          is_neutral: true,
          is_visible: true,
          health: 500,
          max_health: 500,
          created_at: new Date().toISOString(),
        })
      }
    }

    // Insert the newly spawned bases
    if (basesToCreate.length > 0) {
      const { error: insertError } = await supabase.from("buildings").insert(basesToCreate)

      if (insertError) {
        throw new Error(`Failed to insert bases: ${insertError.message}`)
      }

      console.log(`[Spawn] Spawned ${basesToCreate.length} bases on World ${worldId}`)
    }

    // Record event
    await supabase.from("base_spawn_events").insert({
      world_id: worldId,
      bases_spawned: basesToCreate.length,
      trigger_reason: "dynamic_scaling",
      metrics_snapshot: { immediate: true },
    })

    return NextResponse.json({
      success: true,
      worldId,
      basesSpawned: basesToCreate.length,
    })
  } catch (error) {
    console.error("[Spawn Immediate] Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

function poissonDiskSamplingInZone(
  centerX: number,
  centerY: number,
  radius: number,
  count: number,
  minDistance: number,
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = []

  for (let i = 0; i < count * 3; i++) {
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * radius

    const x = centerX + Math.cos(angle) * distance
    const y = centerY + Math.sin(angle) * distance

    let valid = true
    for (const p of points) {
      const dx = p.x - x
      const dy = p.y - y
      if (Math.sqrt(dx * dx + dy * dy) < minDistance) {
        valid = false
        break
      }
    }

    if (valid) {
      points.push({ x, y })
      if (points.length >= count) break
    }
  }

  return points
}
