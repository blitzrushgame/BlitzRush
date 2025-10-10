import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Get user's alliance
  const { data: userData } = await supabase.from("users").select("alliance_id").eq("id", user.id).single()

  if (!userData?.alliance_id) {
    return NextResponse.json({ error: "Not in an alliance" }, { status: 400 })
  }

  // Fetch news posts for the alliance
  const { data: newsPosts, error } = await supabase
    .from("alliance_news")
    .select("*")
    .eq("alliance_id", userData.alliance_id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ posts: newsPosts })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  const { title, content } = await request.json()

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
  }

  const { data: memberData, error: memberError } = await supabase
    .from("alliance_members")
    .select("alliance_id, role")
    .eq("user_id", user.id)
    .single()

  if (memberError || !memberData) {
    return NextResponse.json({ error: "Not in an alliance" }, { status: 400 })
  }

  // Check if user is leader or co-leader
  if (memberData.role !== "leader" && memberData.role !== "co-leader") {
    return NextResponse.json({ error: "Only leaders and co-leaders can post news" }, { status: 403 })
  }

  // Fetch username separately
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Create news post
  const { error } = await supabase.from("alliance_news").insert({
    alliance_id: memberData.alliance_id,
    author_id: user.id,
    author_username: userData.username,
    title,
    content,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
