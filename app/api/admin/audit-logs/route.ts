import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuth } from "@/lib/admin/auth"
import { getAuditLogs } from "@/lib/admin/audit"

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const logs = await getAuditLogs(limit, offset)

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("[v0] Error fetching audit logs:", error)
    return NextResponse.json({ error: "Unauthorized or fetch failed" }, { status: 401 })
  }
}
