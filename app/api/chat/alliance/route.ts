import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const allianceId = searchParams.get("allianceId")
    const userId = searchParams.get("userId")

    if (!allianceId || !userId) {
      return NextResponse.json({ error: "Alliance ID and User ID required" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: userData } = await supabase
      .from("alliance_members")
      .select("alliance_id")
      .eq("user_id", userId)
      .eq("alliance_id", allianceId)
      .single()

    if (!userData) {
      return NextResponse.json({ error: "Unauthorized - not a member of this alliance" }, { status: 403 })
    }

    const { data: messages, error: messagesError } = await supabase
      .from("alliance_chat")
      .select("*")
      .eq("alliance_id", allianceId)
      .order("created_at", { ascending: false })
      .limit(20)

    if (messagesError) {
      console.error("[v0] Error fetching alliance messages:", messagesError)
      return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json([])
    }

    const userIds = [...new Set(messages.map((msg: any) => msg.user_id))]

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, profile_picture")
      .in("id", userIds)

    if (usersError) {
      console.error("[v0] Error fetching users:", usersError)
    }

    const userMap = new Map(users?.map((u: any) => [u.id, u]) || [])

    const messagesWithPictures = messages.reverse().map((msg: any) => {
      const user = userMap.get(msg.user_id)

      return {
        ...msg,
        profile_picture: user?.profile_picture || null,
      }
    })

    return NextResponse.json(messagesWithPictures)
  } catch (error: any) {
    console.error("[v0] Unexpected error in GET /api/chat/alliance:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId, username, allianceId, message } = await request.json()

    if (!userId || !username || !allianceId || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: userData } = await supabase
      .from("alliance_members")
      .select("alliance_id")
      .eq("user_id", userId)
      .eq("alliance_id", allianceId)
      .single()

    if (!userData) {
      return NextResponse.json({ error: "Unauthorized - not a member of this alliance" }, { status: 403 })
    }

    const threeSecondsAgo = new Date(Date.now() - 3000).toISOString()
    const { data: recentMessages } = await supabase
      .from("alliance_chat")
      .select("created_at")
      .eq("user_id", userId)
      .eq("alliance_id", allianceId)
      .gte("created_at", threeSecondsAgo)
      .limit(1)

    if (recentMessages && recentMessages.length > 0) {
      return NextResponse.json({ error: "Please wait 3 seconds between messages" }, { status: 429 })
    }

    const { error: insertError } = await supabase.from("alliance_chat").insert({
      user_id: userId,
      username,
      alliance_id: allianceId,
      message,
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error("[v0] Error inserting alliance message:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Unexpected error in POST /api/chat/alliance:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
