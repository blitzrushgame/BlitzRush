import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  const { username } = await request.json()

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("users")
    .select("auth_user_id, username, email")
    .ilike("username", username)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: "Username not found" }, { status: 404 })
  }

  const { data: authData, error: authError } = await supabase.auth.admin.getUserById(data.auth_user_id)

  if (authError || !authData.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (!authData.user.email_confirmed_at) {
    return NextResponse.json(
      { error: "Please verify your email before logging in. Check your inbox for the verification link." },
      { status: 403 },
    )
  }

  return NextResponse.json({ email: authData.user.email })
}
