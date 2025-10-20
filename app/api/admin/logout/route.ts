import { type NextRequest, NextResponse } from "next/server"
import { getAdminSession, destroyAdminSession } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"
import { getClientIP } from "@/lib/admin/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    const ip = getClientIP(request)

    if (session) {
      await logAdminAction({
        admin_id: session.adminId,
        admin_email: session.email,
        action: "logout",
        ip_address: ip,
        user_agent: request.headers.get("user-agent") || "unknown",
        success: true,
      })
    }

    await destroyAdminSession()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Logout error:", error)
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
