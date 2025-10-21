import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  const { username, email, auth_user_id } = await request.json()

  console.log("[v0] Register API called for username:", username, "email:", email, "auth_user_id:", auth_user_id)

  const supabase = createServiceRoleClient()

  const { data: existing, error: checkError } = await supabase
    .from("users")
    .select("id")
    .ilike("username", username)
    .maybeSingle()

  if (checkError) {
    console.error("[v0] Error checking username:", checkError)
    return NextResponse.json({ error: "Database error checking username" }, { status: 500 })
  }

  if (existing) {
    console.log("[v0] Username already taken:", username)
    return NextResponse.json({ error: "Username already taken" }, { status: 400 })
  }

  console.log("[v0] Creating user record in database")
  const { error } = await supabase.from("users").insert({
    auth_user_id: auth_user_id,
    username: username,
    email: email,
    password: "supabase_auth",
    ip_address: "0.0.0.0",
    is_banned: false,
    is_muted: false,
    ban_type: null,
    ban_reason: null,
    banned_at: null,
    banned_until: null,
    banned_by_admin_id: null,
    mute_type: null,
    mute_reason: null,
    muted_at: null,
    muted_until: null,
    muted_by_admin_id: null,
  })

  if (error) {
    console.error("[v0] Error creating user - Full error object:", JSON.stringify(error, null, 2))
    console.error("[v0] Error code:", error.code)
    console.error("[v0] Error message:", error.message)
    console.error("[v0] Error details:", error.details)

    if (error.code === "23505") {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 })
    }

    return NextResponse.json({ error: "Database error saving new user" }, { status: 500 })
  }

  console.log("[v0] User created successfully:", username)
  return NextResponse.json({ success: true })
}
