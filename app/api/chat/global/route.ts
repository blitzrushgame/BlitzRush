import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: Request) {
  console.log("[v0] GET /api/chat/global - Starting request")

  try {
    const supabase = createServiceRoleClient()
    console.log("[v0] Supabase client created")

    // Fetch messages with basic user data
    const { data: messages, error: messagesError } = await supabase
      .from("global_chat")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    console.log("[v0] Messages fetched:", messages?.length || 0, "Error:", messagesError?.message || "none")

    if (messagesError) {
      console.error("[v0] Supabase error fetching messages:", messagesError)
      return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    if (!messages || messages.length === 0) {
      console.log("[v0] No messages found, returning empty array")
      return NextResponse.json([])
    }

    // Get unique user IDs
    const userIds = [...new Set(messages.map((msg: any) => msg.user_id))]
    console.log("[v0] Unique user IDs:", userIds)

    // Fetch user data with alliance info
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, alliance_id, profile_picture")
      .in("id", userIds)

    console.log("[v0] Users fetched:", users?.length || 0, "Error:", usersError?.message || "none")

    if (usersError) {
      console.error("[v0] Error fetching users:", usersError)
    }

    // Fetch alliance data for users with alliances
    const allianceIds = users?.filter((u: any) => u.alliance_id).map((u: any) => u.alliance_id) || []

    console.log("[v0] Alliance IDs to fetch:", allianceIds)

    let alliances: any[] = []
    if (allianceIds.length > 0) {
      const { data: allianceData, error: alliancesError } = await supabase
        .from("alliances")
        .select("id, tag")
        .in("id", allianceIds)

      console.log("[v0] Alliances fetched:", allianceData?.length || 0, "Error:", alliancesError?.message || "none")

      if (alliancesError) {
        console.error("[v0] Error fetching alliances:", alliancesError)
      } else {
        alliances = allianceData || []
      }
    }

    // Create lookup maps
    const userMap = new Map(users?.map((u: any) => [u.id, u]) || [])
    const allianceMap = new Map(alliances.map((a: any) => [a.id, a]))

    console.log("[v0] Creating enriched messages")

    // Enrich messages with user and alliance data
    const messagesWithTags = messages.reverse().map((msg: any) => {
      const user = userMap.get(msg.user_id)
      const alliance = user?.alliance_id ? allianceMap.get(user.alliance_id) : null

      return {
        id: msg.id,
        user_id: msg.user_id,
        username: msg.username,
        message: msg.message,
        created_at: msg.created_at,
        alliance_tag: alliance?.tag || null,
        profile_picture: user?.profile_picture || null,
      }
    })

    console.log("[v0] Returning", messagesWithTags.length, "enriched messages")
    return NextResponse.json(messagesWithTags)
  } catch (error: any) {
    console.error("[v0] Unexpected error in GET /api/chat/global:", error)
    console.error("[v0] Error stack:", error.stack)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId, username, message } = await request.json()

    if (!userId || !username || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const threeSecondsAgo = new Date(Date.now() - 3000).toISOString()
    const { data: recentMessages } = await supabase
      .from("global_chat")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", threeSecondsAgo)
      .limit(1)

    if (recentMessages && recentMessages.length > 0) {
      return NextResponse.json({ error: "Please wait 3 seconds between messages" }, { status: 429 })
    }

    const { error: insertError } = await supabase.from("global_chat").insert({
      user_id: userId,
      username,
      message,
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error("[v0] Error inserting message:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Unexpected error in POST /api/chat/global:", error)
    console.error("[v0] Error stack:", error.stack)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
