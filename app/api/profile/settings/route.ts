import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function PATCH(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { blockAllianceInvites } = await request.json()

  if (typeof blockAllianceInvites !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("users")
    .update({ block_alliance_invites: blockAllianceInvites })
    .eq("id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
