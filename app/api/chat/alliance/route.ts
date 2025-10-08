import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: Request) {
  console.log("[v0] GET /api/chat/alliance - Starting request")
  try {
    const { searchParams } = new URL(request.url)
    const allianceId = searchParams.get("allianceId")
    const userId = searchParams.get("userId")

    console.log("[v0] Alliance chat GET - allianceId:", allianceId, "userId:", userId)

    if (!allianceId || !userId) {
      console.log("[v0] Missing required parameters")
      return NextResponse.json({ error: "Alliance ID and User ID required" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    console.log("[v0] Supabase client created")

    const { data: userData, error: memberError } = await supabase
      .from("alliance_members")
      .select("alliance_id")
      .eq("user_id", userId)
      .eq("alliance_id", allianceId)
      .single()

    console.log("[v0] Member check - userData:", userData, "error:", memberError)

    if (memberError || !userData) {
      console.log("[v0] User is not a member of this alliance")
      return NextResponse.json({ error: "Unauthorized - not a member of this alliance" }, { status: 403 })
    }

    const { data: messages, error: messagesError } = await supabase
      .from("alliance_chat")
      .select("*")
      .eq("alliance_id", allianceId)
      .order("created_at", { ascending: false })
      .limit(20)

    console.log("[v0] Messages fetched:", messages?.length || 0, "error:", messagesError)

    if (messagesError) {
      console.error("[v0] Error fetching alliance messages:", messagesError)
      return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    if (!messages || messages.length === 0) {
      console.log("[v0] No messages found, returning empty array")
      return NextResponse.json([])
    }

    const userIds = [...new Set(messages.map((msg: any) => msg.user_id))]
    console.log("[v0] Fetching profile pictures for users:", userIds)

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

    console.log("[v0] Returning", messagesWithPictures.length, "enriched messages")
    return NextResponse.json(messagesWithPictures)
  } catch (error: any) {
    console.error("[v0] Unexpected error in GET /api/chat/alliance:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  console.log("[v0] POST /api/chat/alliance - Starting request")
  try {
    const body = await request.json()
    const { userId, username, allianceId, message } = body

    console.log(
      "[v0] Alliance chat POST - userId:",
      userId,
      "allianceId:",
      allianceId,
      "message length:",
      message?.length,
    )

    if (!userId || !username || !allianceId || !message) {
      console.log("[v0] Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: userData, error: memberError } = await supabase
      .from("alliance_members")
      .select("alliance_id")
      .eq("user_id", userId)
      .eq("alliance_id", allianceId)
      .single()

    console.log("[v0] Member verification - userData:", userData, "error:", memberError)

    if (memberError || !userData) {
      console.log("[v0] User is not authorized to post in this alliance")
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
      console.log("[v0] Rate limit hit for user:", userId)
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

    console.log("[v0] Alliance message inserted successfully")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Unexpected error in POST /api/chat/alliance:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
