import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import AllianceManagement from "@/components/alliance-management"
import AllianceLeaderboard from "@/components/alliance-leaderboard"

export default async function AlliancePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/sign-up")
  }

  const supabase = createServiceRoleClient()

  // Check if user is in an alliance
  const { data: membership } = await supabase
    .from("alliance_members")
    .select("*, alliances(*)")
    .eq("user_id", user.id)
    .maybeSingle()

  // If user is in an alliance, show management page
  if (membership && membership.alliances) {
    // Get all alliance members with their details
    const { data: members } = await supabase
      .from("alliance_members")
      .select(`
        *,
        users (
          id,
          username,
          created_at
        )
      `)
      .eq("alliance_id", membership.alliance_id)
      .order("role", { ascending: true })
      .order("joined_at", { ascending: true })

    // Get join requests if user is leader or co-leader
    let joinRequests = []
    if (membership.role === "leader" || membership.role === "co-leader") {
      const { data: requests } = await supabase
        .from("alliance_join_requests")
        .select(`
          *,
          users (
            id,
            username
          )
        `)
        .eq("alliance_id", membership.alliance_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      joinRequests = requests || []
    }

    return (
      <AllianceManagement
        alliance={membership.alliances}
        members={members || []}
        currentUserRole={membership.role}
        currentUserId={user.id}
        joinRequests={joinRequests}
      />
    )
  }

  // If user is not in an alliance, show leaderboard and create option
  const { data: alliances } = await supabase
    .from("alliances")
    .select("*")
    .order("total_points", { ascending: false })
    .limit(50)

  return <AllianceLeaderboard alliances={alliances || []} currentUserId={user.id} />
}
