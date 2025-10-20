import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ userId: null }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  await supabase.from("users").update({ last_activity: new Date().toISOString() }).eq("id", user.id)

  return NextResponse.json({ userId: user.id, username: user.username })
}
