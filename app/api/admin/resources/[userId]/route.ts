import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireAdminAuth } from "@/lib/admin/auth"

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const authResult = await requireAdminAuth()
  if (!authResult.authenticated || !authResult.admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await params
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase.from("users").select("game_data").eq("id", userId).single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const gameData = data?.game_data as any
  const resources = gameData?.resources || { concrete: 0, steel: 0, carbon: 0, fuel: 0 }

  return NextResponse.json({ resources })
}
