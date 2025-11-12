import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { WorldGenerator } from "@/lib/generation/world-generator"
import { BaseSpawner } from "@/lib/generation/base-spawner"

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

function generateSeedFromWorldNumber(worldNumber: number): number {
  // Deterministic seed based on world number
  return Math.abs(Math.sin(worldNumber * 12.9898) * 43758.5453 * 1000000) >> 0
}

export async function POST(req: NextRequest) {
  try {
    const { worldNumber, mapSize = 5000 } = await req.json()

    if (!worldNumber || worldNumber < 1) {
      return NextResponse.json({ error: "Valid world number is required" }, { status: 400 })
    }

    console.log(`[WorldGen API] Starting world ${worldNumber} generation`)

    const seed = generateSeedFromWorldNumber(worldNumber)
    const supabase = await getSupabaseClient()

    // Check if world already exists
    const { data: existingWorld } = await supabase.from("worlds").select("id").eq("world_number", worldNumber).single()

    if (existingWorld) {
      return NextResponse.json({ error: `World ${worldNumber} already exists` }, { status: 409 })
    }

    // Generate world infrastructure
    console.log(`[WorldGen API] Generating infrastructure with seed ${seed}`)
    const generator = new WorldGenerator(seed, mapSize)
    const worldData = await generator.generateCompleteWorld()

    // Create world record
    const { data: world, error: worldError } = await supabase
      .from("worlds")
      .insert({
        world_number: worldNumber,
        seed,
        status: "genesis",
        map_size: mapSize,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (worldError || !world) {
      throw new Error(`Failed to create world: ${worldError?.message}`)
    }

    console.log(`[WorldGen API] World ${worldNumber} created with ID ${world.id}`)

    // Insert rivers
    if (worldData.rivers.length > 0) {
      const { error: riverError } = await supabase.from("world_rivers").insert(
        worldData.rivers.map((river) => ({
          world_id: world.id,
          river_index: river.index,
          path_points: river.pathPoints,
          width: river.width,
          flow_direction: river.flowDirection,
          total_length: river.totalLength,
        })),
      )

      if (riverError) {
        throw new Error(`Failed to insert rivers: ${riverError.message}`)
      }
    }

    // Insert railroads
    if (worldData.railroads.length > 0) {
      const { error: railroadError } = await supabase.from("world_railroads").insert(
        worldData.railroads.map((railroad) => ({
          world_id: world.id,
          railroad_index: railroad.index,
          path_points: railroad.pathPoints,
          railroad_type: railroad.type,
          total_length: railroad.totalLength,
        })),
      )

      if (railroadError) {
        throw new Error(`Failed to insert railroads: ${railroadError.message}`)
      }
    }

    // Insert bridges
    if (worldData.bridges.length > 0) {
      const { error: bridgeError } = await supabase.from("world_bridges").insert(
        worldData.bridges.map((bridge) => ({
          world_id: world.id,
          position: bridge.position,
          rotation: bridge.rotation,
        })),
      )

      if (bridgeError) {
        throw new Error(`Failed to insert bridges: ${bridgeError.message}`)
      }
    }

    // Generate base zones and spawn initial bases
    console.log(`[WorldGen API] Generating base zones`)
    const spawner = new BaseSpawner(seed, {
      mapSize,
      groundBasePercentage: 0.8,
      heliBasesTarget: 25,
      airBasesTotal: 6,
      navalBasesTotal: 10,
      trainBasesTotal: 10,
    })

    const spawnResult = spawner.generateBaseZones(worldData.rivers, worldData.railroads)

    // Insert base zones
    if (spawnResult.zones.length > 0) {
      const { error: zoneError } = await supabase.from("world_base_zones").insert(
        spawnResult.zones.map((zone) => ({
          world_id: world.id,
          zone_type: zone.zoneType,
          center_x: zone.centerX,
          center_y: zone.centerY,
          radius: zone.radius,
          base_count: zone.baseCount,
          specialization: zone.specialization,
        })),
      )

      if (zoneError) {
        throw new Error(`Failed to insert base zones: ${zoneError.message}`)
      }
    }

    // Spawn initial bases from zones
    console.log(`[WorldGen API] Spawning ${spawnResult.totalExpectedBases} initial bases`)
    const basesToCreate = []

    const minDistance = 60 // Declare minDistance variable

    for (const zone of spawnResult.zones) {
      const basesInZone = poissonDiskSamplingInZone(
        zone.centerX,
        zone.centerY,
        zone.radius,
        zone.baseCount,
        minDistance,
      )

      for (const basePos of basesInZone) {
        basesToCreate.push({
          world_id: world.id,
          x: basePos.x,
          y: basePos.y,
          base_type: zone.zoneType === "standard" ? "command_center" : "outpost",
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

    if (basesToCreate.length > 0) {
      const { error: baseError } = await supabase.from("buildings").insert(basesToCreate)

      if (baseError) {
        throw new Error(`Failed to create bases: ${baseError.message}`)
      }
    }

    // Record spawn event
    await supabase.from("base_spawn_events").insert({
      world_id: world.id,
      bases_spawned: basesToCreate.length,
      trigger_reason: "startup",
      metrics_snapshot: spawnResult.baseTypeDistribution,
    })

    // Update world status to active
    await supabase.from("worlds").update({ status: "active" }).eq("id", world.id)

    console.log(`[WorldGen API] World ${worldNumber} generation complete`)

    return NextResponse.json({
      success: true,
      worldNumber,
      worldId: world.id,
      totalBases: basesToCreate.length,
      infrastructure: {
        rivers: worldData.rivers.length,
        railroads: worldData.railroads.length,
        bridges: worldData.bridges.length,
      },
      baseDistribution: spawnResult.baseTypeDistribution,
    })
  } catch (error) {
    console.error("[WorldGen API] Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

// Helper function for Poisson disk sampling within a zone
function poissonDiskSamplingInZone(
  centerX: number,
  centerY: number,
  radius: number,
  count: number,
  minDistance: number,
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = []
  const cellSize = minDistance / Math.sqrt(2)

  for (let i = 0; i < count * 3; i++) {
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * radius

    const x = centerX + Math.cos(angle) * distance
    const y = centerY + Math.sin(angle) * distance

    // Check if point is valid (not too close to others)
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
