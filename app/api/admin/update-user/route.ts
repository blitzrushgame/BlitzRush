import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: NextRequest) {
  try {
    const { userId, username, password } = await request.json()
    const supabase = createServiceRoleClient()

    if (username) {
      const { error } = await supabase.from("users").update({ username }).eq("id", userId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    if (password) {
      const { error } = await supabase.from("users").update({ password }).eq("id", userId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
