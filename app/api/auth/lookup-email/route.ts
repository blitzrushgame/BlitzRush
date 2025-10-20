import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  const { username } = await request.json()

  console.log("[v0] Looking up email for username:", username)

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("users")
    .select("id, username, email")
    .ilike("username", username)
    .maybeSingle()

  if (error || !data) {
    console.log("[v0] Username not found:", username)
    return NextResponse.json({ error: "Username not found. Please create a new account." }, { status: 404 })
  }

  if (!data.email) {
    console.log("[v0] User found but no email:", username)
    return NextResponse.json({ error: "User account is incomplete. Please contact support." }, { status: 404 })
  }

  console.log("[v0] Email found for username:", username)
  return NextResponse.json({ email: data.email })
}
