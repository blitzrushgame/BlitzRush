import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ authenticated: false })
  }

  // Return the auth_user_id (UUID) from Supabase Auth
  return NextResponse.json({ authenticated: true, userId: user.id })
}
