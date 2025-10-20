import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Get the user profile from custom users table
    const { data: profile } = await supabase.from("users").select("id, username").eq("auth_user_id", user.id).single()

    return NextResponse.json({
      authenticated: true,
      userId: profile?.id,
      username: profile?.username,
      email: user.email,
    })
  }

  return NextResponse.json({ authenticated: false })
}
