import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's database record
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get IP address from request headers
    const forwarded = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const ipAddress = forwarded?.split(",")[0] || realIp || "unknown"

    // Insert or update IP history (upsert)
    const { error: ipError } = await supabase
      .from("user_ip_history")
      .upsert(
        {
          user_id: user.id,
          ip_address: ipAddress,
          last_seen: new Date().toISOString(),
        },
        {
          onConflict: "user_id,ip_address",
          ignoreDuplicates: false,
        },
      )
      .select()

    // If upsert failed, try to update the existing record
    if (ipError) {
      const { error: updateError } = await supabase
        .from("user_ip_history")
        .update({
          last_seen: new Date().toISOString(),
          access_count: supabase.rpc("increment", { row_id: user.id }),
        })
        .eq("user_id", user.id)
        .eq("ip_address", ipAddress)

      if (updateError) {
        console.error("[v0] Error updating IP history:", updateError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error logging IP:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
