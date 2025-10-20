import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface AuditLogEntry {
  admin_id: number | null // Made admin_id nullable for logging attempts before admin exists
  admin_email: string
  action: string
  resource_type?: string
  resource_id?: string
  details?: Record<string, any>
  ip_address: string
  user_agent?: string
  success: boolean
  error_message?: string
}

/**
 * Log an admin action to the audit trail
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase.from("admin_audit_log").insert({
    admin_id: entry.admin_id,
    admin_email: entry.admin_email,
    action: entry.action,
    resource_type: entry.resource_type || null,
    resource_id: entry.resource_id || null,
    details: entry.details || null,
    ip_address: entry.ip_address,
    user_agent: entry.user_agent || null,
    success: entry.success,
    error_message: entry.error_message || null,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error("[v0] Error logging admin action:", error)
  }
}

/**
 * Get recent audit logs
 */
export async function getAuditLogs(limit = 100, offset = 0): Promise<any[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error("[v0] Error fetching audit logs:", error)
    return []
  }

  return data || []
}

/**
 * Get audit logs for a specific admin
 */
export async function getAdminAuditLogs(adminId: number, limit = 50): Promise<any[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[v0] Error fetching admin audit logs:", error)
    return []
  }

  return data || []
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(resourceType: string, resourceId: string, limit = 50): Promise<any[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[v0] Error fetching resource audit logs:", error)
    return []
  }

  return data || []
}
