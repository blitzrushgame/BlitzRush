import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminAuth } from "@/lib/admin/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const adminAuth = await requireAdminAuth()
    if (!adminAuth.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.id
    const supabase = await createClient()

    // Fetch IP history for the user
    const { data: ipHistory, error } = await supabase
      .from("user_ip_history")
      .select("ip_address, first_seen, last_seen, access_count")
      .eq("user_id", userId)
      .order("last_seen", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching IP history:", error)
      return NextResponse.json({ error: "Failed to fetch IP history" }, { status: 500 })
    }

    return NextResponse.json(ipHistory || [])
  } catch (error) {
    console.error("[v0] Error in IP history route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
