import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: Request) {
  try {
    const supabase = createServiceRoleClient()

    const { data: messages, error: messagesError } = await supabase
      .from("global_chat")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (messagesError) {
      console.error("[v0] Supabase error fetching messages:", messagesError)
      return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json([])
    }

    const userIds = [...new Set(messages.map((msg: any) => msg.user_id))]

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, alliance_id, profile_picture")
      .in("id", userIds)

    if (usersError) {
      console.error("[v0] Error fetching users:", usersError)
    }

    const allianceIds = users?.filter((u: any) => u.alliance_id).map((u: any) => u.alliance_id) || []

    let alliances: any[] = []
    if (allianceIds.length > 0) {
      const { data: allianceData, error: alliancesError } = await supabase
        .from("alliances")
        .select("id, tag")
        .in("id", allianceIds)

      if (alliancesError) {
        console.error("[v0] Error fetching alliances:", alliancesError)
      } else {
        alliances = allianceData || []
      }
    }

    const userMap = new Map(users?.map((u: any) => [u.id, u]) || [])
    const allianceMap = new Map(alliances.map((a: any) => [a.id, a]))

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

    const { data: userData } = await supabase
      .from("users")
      .select("is_muted, mute_type, mute_reason, muted_until")
      .eq("id", userId)
      .single()

    if (userData?.is_muted) {
      // Check if temporary mute has expired
      if (userData.mute_type === "temporary" && userData.muted_until) {
        const expirationDate = new Date(userData.muted_until)
        if (expirationDate < new Date()) {
          // Mute has expired, remove it
          await supabase
            .from("users")
            .update({
              is_muted: false,
              mute_type: null,
              mute_reason: null,
              muted_until: null,
              muted_at: null,
              muted_by_admin_id: null,
            })
            .eq("id", userId)
        } else {
          return NextResponse.json(
            { error: userData.mute_reason || "You are muted and cannot send messages" },
            { status: 403 },
          )
        }
      } else {
        return NextResponse.json(
          { error: userData.mute_reason || "You are muted and cannot send messages" },
          { status: 403 },
        )
      }
    }

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
