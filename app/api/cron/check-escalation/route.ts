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

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "")
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await getSupabaseClient()

    // Get current active world
    const { data: activeWorld } = await supabase
      .from("worlds")
      .select("id, world_number, status, created_at")
      .eq("status", "active")
      .single()

    if (!activeWorld) {
      return NextResponse.json({
        status: "no_active_world",
        message: "No active world found",
      })
    }

    // Count bases
    const { count: totalBases } = await supabase
      .from("buildings")
      .select("id", { count: "exact" })
      .eq("world_id", activeWorld.id)

    const { count: claimedBases } = await supabase
      .from("buildings")
      .select("id", { count: "exact" })
      .eq("world_id", activeWorld.id)
      .not("user_id", "is", null)

    const percentageClaimed = totalBases && claimedBases ? (claimedBases / totalBases) * 100 : 0

    console.log(
      `[Cron] World ${activeWorld.world_number}: ${claimedBases}/${totalBases} bases claimed (${percentageClaimed.toFixed(1)}%)`,
    )

    // Check if we should trigger escalation (500 bases minimum)
    if (totalBases && totalBases >= 500 && activeWorld.status === "active") {
      console.log(`[Cron] World ${activeWorld.world_number} reached ${totalBases} bases. Triggering escalation.`)

      const escalationDate = new Date()
      const targetReleaseDate = new Date(escalationDate.getTime() + 24 * 60 * 60 * 1000)

      await supabase
        .from("worlds")
        .update({
          status: "escalation",
          escalation_triggered_at: escalationDate.toISOString(),
          target_release_date: targetReleaseDate.toISOString(),
        })
        .eq("id", activeWorld.id)

      return NextResponse.json({
        status: "escalation_triggered",
        worldNumber: activeWorld.world_number,
        targetReleaseDate,
      })
    }

    // Check if escalation timer has expired
    if (activeWorld.status === "escalation") {
      const { data: escalatingWorld } = await supabase
        .from("worlds")
        .select("id, world_number, target_release_date")
        .eq("id", activeWorld.id)
        .single()

      if (escalatingWorld && escalatingWorld.target_release_date) {
        const targetDate = new Date(escalatingWorld.target_release_date)
        if (new Date() >= targetDate) {
          console.log(`[Cron] Closing World ${escalatingWorld.world_number}. Escalation timer expired.`)

          // Close current world
          await supabase.from("worlds").update({ status: "closed" }).eq("id", escalatingWorld.id)

          // Trigger next world generation
          const nextWorldNumber = escalatingWorld.world_number + 1
          const generateResponse = await fetch(
            `${process.env.VERCEL_URL || "http://localhost:3000"}/api/admin/generate-world`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ worldNumber: nextWorldNumber }),
            },
          )

          if (generateResponse.ok) {
            return NextResponse.json({
              status: "world_closed_and_new_generated",
              closedWorldNumber: escalatingWorld.world_number,
              newWorldNumber: nextWorldNumber,
            })
          }
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      worldNumber: activeWorld.world_number,
      totalBases,
      claimedBases,
      percentageClaimed: percentageClaimed.toFixed(1),
    })
  } catch (error) {
    console.error("[Cron] Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
