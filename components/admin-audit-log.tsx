"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity } from "lucide-react"

interface AuditLogEntry {
  id: number
  admin_email: string
  action: string
  resource_type: string | null
  resource_id: string | null
  details: any
  ip_address: string
  user_agent: string | null
  success: boolean
  error_message: string | null
  created_at: string
}

export function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/admin/audit-logs?limit=50")
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error("Error fetching audit logs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes("login")) return <Shield className="w-4 h-4" />
    if (action.includes("delete")) return <XCircle className="w-4 h-4" />
    if (action.includes("update") || action.includes("edit")) return <Activity className="w-4 h-4" />
    return <CheckCircle className="w-4 h-4" />
  }

  const getActionColor = (action: string, success: boolean) => {
    if (!success) return "destructive"
    if (action.includes("delete")) return "destructive"
    if (action.includes("login")) return "default"
    return "secondary"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  if (isLoading) {
    return (
      <Card className="bg-neutral-900/50 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-amber-400">Audit Log</CardTitle>
          <CardDescription>Loading audit trail...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="bg-neutral-900/50 border-neutral-700">
      <CardHeader>
        <CardTitle className="text-amber-400 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Audit Log
        </CardTitle>
        <CardDescription>Recent admin actions and security events</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-neutral-400 text-sm text-center py-8">No audit logs found</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 bg-neutral-800/50 border border-neutral-700/50 rounded-lg hover:border-neutral-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">{getActionIcon(log.action)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getActionColor(log.action, log.success)} className="font-mono text-xs">
                            {log.action}
                          </Badge>
                          {!log.success && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-neutral-300 mt-1">
                          <span className="font-semibold">{log.admin_email}</span>
                          {log.resource_type && (
                            <>
                              {" "}
                              on <span className="text-amber-400">{log.resource_type}</span>
                              {log.resource_id && <span className="text-neutral-400"> #{log.resource_id}</span>}
                            </>
                          )}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                          <span>IP: {log.ip_address}</span>
                          <span>{formatDate(log.created_at)}</span>
                        </div>
                        {log.error_message && (
                          <p className="text-xs text-red-400 mt-2 font-mono">{log.error_message}</p>
                        )}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-neutral-400 cursor-pointer hover:text-neutral-300">
                              View details
                            </summary>
                            <pre className="text-xs text-neutral-400 mt-1 p-2 bg-neutral-900/50 rounded overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
