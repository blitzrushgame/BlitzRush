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

  const serviceSupabase = createServiceRoleClient()
  const { data: userData, error: userError } = await serviceSupabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (userError || !userData) {
    console.log("[v0] User not found in database for auth_user_id:", user.id)
    return NextResponse.json({
      authenticated: false,
      error: "Account not found. Please sign up first.",
    })
  }

  // Return the integer id from the users table
  return NextResponse.json({ authenticated: true, userId: userData.id })
}
