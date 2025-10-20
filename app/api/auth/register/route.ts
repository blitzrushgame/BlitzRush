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

  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const ip = forwarded ? forwarded.split(",")[0].trim() : realIp || "unknown"

  console.log("[v0] Creating user record in database with IP:", ip)

  const insertData = {
    username: username,
    email: email,
    password: "supabase_auth",
    ip_address: ip,
  }

  console.log("[v0] Insert data:", JSON.stringify(insertData))

  const { data: insertedData, error } = await supabase.from("users").insert(insertData).select()

  if (error) {
    console.error("[v0] Error creating user - Full error object:", JSON.stringify(error, null, 2))
    console.error("[v0] Error code:", error.code)
    console.error("[v0] Error message:", error.message)
    console.error("[v0] Error details:", error.details)
    console.error("[v0] Error hint:", error.hint)

    if (error.code === "23505") {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: "Database error saving new user",
        details: error.message, // Include error message for debugging
      },
      { status: 500 },
    )
  }

  console.log("[v0] User created successfully:", username, "Data:", JSON.stringify(insertedData))
  return NextResponse.json({ success: true })
}
