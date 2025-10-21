import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function logAdminAction(
  adminId: number,
  actionType: string,
  request: Request,
  metadata?: Record<string, any>,
) {
  try {
    const supabase = createServiceRoleClient()

    // Get IP address from request headers
    const forwardedFor = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const ipAddress = forwardedFor?.split(",")[0] || realIp || "unknown"

    // Log the action
    await supabase.from("admin_audit_log").insert({
      admin_id: adminId,
      action_type: actionType,
      ip_address: ipAddress,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error logging admin action:", error)
    // Don't throw error - logging failure shouldn't break the main action
  }
}
