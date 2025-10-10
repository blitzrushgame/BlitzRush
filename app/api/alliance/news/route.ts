import { createServerClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createServerClient()
  const cookieStore = await cookies()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
  const supabase = await createServerClient()
  const cookieStore = await cookies()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { title, content } = await request.json()

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
  }

  // Get user's alliance and role
  const { data: memberData } = await supabase
    .from("alliance_members")
    .select("alliance_id, role, users(username)")
    .eq("user_id", user.id)
    .single()

  if (!memberData) {
    return NextResponse.json({ error: "Not in an alliance" }, { status: 400 })
  }

  // Check if user is leader or co-leader
  if (memberData.role !== "leader" && memberData.role !== "co-leader") {
    return NextResponse.json({ error: "Only leaders and co-leaders can post news" }, { status: 403 })
  }

  // Create news post
  const { error } = await supabase.from("alliance_news").insert({
    alliance_id: memberData.alliance_id,
    author_id: user.id,
    author_username: memberData.users.username,
    title,
    content,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
