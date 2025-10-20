import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireAdminAuth } from "@/lib/admin/auth"

export async function GET() {
  const authResult = await requireAdminAuth()
  if (!authResult.authenticated || !authResult.admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("private_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
