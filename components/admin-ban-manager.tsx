"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Ban {
  id: number
  ip_address: string
  reason?: string
}

export function AdminIPBanManager() {
  const [bans, setBans] = useState<Ban[]>([])
  const [ip, setIp] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchBans = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/banned-ips")
      const data = await res.json()
      setBans(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error fetching banned IPs:", err)
      setBans([])
    } finally {
      setLoading(false)
    }
  }

  const banIp = async () => {
    if (!ip) return alert("Please enter an IP")
    try {
      const res = await fetch("/api/admin/ban-ip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, reason }),
      })
      const result = await res.json()
      if (res.ok) {
        setIp("")
        setReason("")
        fetchBans()
      } else {
        alert(result.error || "Failed to ban IP")
      }
    } catch (err) {
      console.error(err)
      alert("Failed to ban IP")
    }
  }

  const unbanIp = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/ban-ip/${id}`, { method: "DELETE" })
      const result = await res.json()
      if (res.ok) {
        fetchBans()
      } else {
        alert(result.error || "Failed to unban IP")
      }
    } catch (err) {
      console.error(err)
      alert("Failed to unban IP")
    }
  }

  useEffect(() => {
    fetchBans()
  }, [])

  if (loading) {
    return <div className="text-muted-foreground">Loading banned IPs...</div>
  }

  return (
    <Card className="p-4">
      <h2 className="text-xl font-bold mb-4">IP Ban Manager</h2>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="IP"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="flex-1"
        />
        <Button onClick={banIp} size="sm">
          Ban
        </Button>
      </div>

      {bans.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No banned IPs yet</p>
      ) : (
        <ScrollArea className="h-[400px]">
          <ul className="space-y-2">
            {bans.map((b) => (
              <li key={b.id} className="flex justify-between items-center border-b py-1">
                <span>{b.ip_address} {b.reason ? `- ${b.reason}` : ""}</span>
                <Button onClick={() => unbanIp(b.id)} variant="outline" size="sm">
                  Unban
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </Card>
  )
}
