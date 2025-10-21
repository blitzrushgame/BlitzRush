import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ authenticated: false })
  }

  if (!user.email_confirmed_at) {
    return NextResponse.json({
      authenticated: false,
      error: "Please verify your email before logging in. Check your inbox for the verification link.",
    })
  }

  const serviceSupabase = createServiceRoleClient()
  const { data: userData, error: userError } = await serviceSupabase
    .from("users")
    .select("id, username")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (userError || !userData) {
    return NextResponse.json({
      authenticated: false,
      error: "Account not found. Please sign up first.",
    })
  }

  // Return the integer id and username from the users table
  return NextResponse.json({
    authenticated: true,
    userId: userData.id,
    username: userData.username,
  })
}
