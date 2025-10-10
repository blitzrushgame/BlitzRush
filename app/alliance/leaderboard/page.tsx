import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import AllianceLeaderboard from "@/components/alliance-leaderboard"

export default async function AllianceLeaderboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/sign-up")
  }

  const supabase = createServiceRoleClient()

  const { data: membership } = await supabase
    .from("alliance_members")
    .select("alliance_id")
    .eq("user_id", user.id)
    .maybeSingle()

  const isInAlliance = !!membership

  // Get all alliances for the leaderboard
  const { data: alliances } = await supabase
    .from("alliances")
    .select("*")
    .order("total_points", { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-amber-400">Alliance Leaderboard</h1>
          <div className="flex gap-3">
            <a
              href="/alliance"
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 border border-amber-500/30 rounded text-amber-400 transition-all"
            >
              Back to Alliance
            </a>
            <a
              href="/game"
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 border border-amber-500/30 rounded text-amber-400 transition-all"
            >
              Back to Game
            </a>
          </div>
        </div>
        <AllianceLeaderboard alliances={alliances || []} currentUserId={user.id} isInAlliance={isInAlliance} />
      </div>
    </div>
  )
}
