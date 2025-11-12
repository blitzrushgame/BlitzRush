import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { calculateDynamicSpawns } from "@/lib/generation/base-spawner"

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

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "")
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await getSupabaseClient()

    // Get active world
    const { data: activeWorld } = await supabase
      .from("worlds")
      .select("id, world_number, total_bases_spawned")
      .eq("status", "active")
      .single()

    if (!activeWorld) {
      return NextResponse.json({ status: "no_active_world" })
    }

    // Get base counts by type
    const { count: totalBases } = await supabase
      .from("buildings")
      .select("id", { count: "exact" })
      .eq("world_id", activeWorld.id)

    const { count: claimedBases } = await supabase
      .from("buildings")
      .select("id", { count: "exact" })
      .eq("world_id", activeWorld.id)
      .not("user_id", "is", null)

    const { count: heliCount } = await supabase
      .from("buildings")
      .select("id", { count: "exact" })
      .eq("world_id", activeWorld.id)
      .eq("base_specialization", "heli")

    const { count: airCount } = await supabase
      .from("buildings")
      .select("id", { count: "exact" })
      .eq("world_id", activeWorld.id)
      .eq("base_specialization", "air")

    const completionPercentage = totalBases && claimedBases ? (claimedBases / totalBases) * 100 : 0

    // Calculate what needs to be spawned
    const spawns = calculateDynamicSpawns(
      totalBases || 0,
      claimedBases || 0,
      heliCount || 0,
      airCount || 0,
      completionPercentage,
    )

    const totalToSpawn = spawns.heliSpawn + spawns.airSpawn + spawns.navalSpawn + spawns.trainSpawn + spawns.groundSpawn

    if (totalToSpawn === 0) {
      return NextResponse.json({
        status: "no_spawns_needed",
        worldNumber: activeWorld.world_number,
      })
    }

    console.log(`[Cron] Spawning ${totalToSpawn} bases on World ${activeWorld.world_number}`)

    // Create spawn event record
    await supabase.from("base_spawn_events").insert({
      world_id: activeWorld.id,
      bases_spawned: totalToSpawn,
      trigger_reason: "dynamic_scaling",
      metrics_snapshot: { spawns, completionPercentage },
    })

    return NextResponse.json({
      status: "bases_spawned",
      worldNumber: activeWorld.world_number,
      spawned: spawns,
      totalSpawned: totalToSpawn,
    })
  } catch (error) {
    console.error("[Cron] Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
