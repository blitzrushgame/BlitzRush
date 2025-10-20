import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("user_session")

  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false })
  }

  try {
    const session = JSON.parse(sessionCookie.value)

    // Verify user still exists in database
    const supabase = createServiceRoleClient()
    const { data: user } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("id", session.userId)
      .maybeSingle()

    if (!user) {
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      username: user.username,
      email: user.email,
    })
  } catch (error) {
    console.error("[v0] Error parsing session:", error)
    return NextResponse.json({ authenticated: false })
  }
}
