import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  const { username, email, auth_user_id } = await request.json()

  const supabase = createServiceRoleClient()

  const { data: existing, error: checkError } = await supabase
    .from("users")
    .select("id")
    .ilike("username", username)
    .maybeSingle()

  if (checkError) {
    console.error("[SERVER] Error checking username:", checkError)
    return NextResponse.json({ error: "Database error checking username" }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 400 })
  }

  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown"

  const { error } = await supabase.from("users").insert({
    auth_user_id: auth_user_id,
    username: username,
    email: email,
    password: "supabase_auth", // Placeholder since Supabase handles auth
    ip_address: ip,
    is_banned: false,
    is_muted: false,
    role: "player",
  })

  if (error) {
    console.error("[SERVER] Error creating user:", error)

    if (error.code === "23505") {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 })
    }

    return NextResponse.json({ error: "Database error saving new user" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
