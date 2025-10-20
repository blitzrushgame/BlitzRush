import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  const { username, email } = await request.json()

  console.log("[v0] Register API called for username:", username, "email:", email)

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
    username: username,
    email: email,
    password: "supabase_auth", // Placeholder to satisfy NOT NULL constraint
    ip_address: "0.0.0.0", // Placeholder to satisfy NOT NULL constraint
  })

  if (error) {
    console.error("[v0] Error creating user:", error)

    if (error.code === "23505") {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 })
    }

    return NextResponse.json({ error: "Database error saving new user" }, { status: 500 })
  }

  console.log("[v0] User created successfully:", username)
  return NextResponse.json({ success: true })
}
