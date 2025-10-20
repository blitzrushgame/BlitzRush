import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const { username, password } = await request.json()

  console.log("[v0] Login attempt for username:", username)

  const supabase = createServiceRoleClient()

  // Get user by username
  const { data: user, error } = await supabase
    .from("users")
    .select("id, username, password, email")
    .ilike("username", username)
    .maybeSingle()

  if (error || !user) {
    console.error("[v0] User not found:", username)
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.password)

  if (!passwordMatch) {
    console.error("[v0] Invalid password for user:", username)
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
  }

  console.log("[v0] Login successful for user:", username)

  // Set session cookie
  const cookieStore = await cookies()
  cookieStore.set("user_session", JSON.stringify({ userId: user.id, username: user.username }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  })
}
