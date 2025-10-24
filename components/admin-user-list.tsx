"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

type User = {
  id: number
  username: string
  ip_address: string
  created_at: string
  is_banned: boolean
  ban_type: string | null
  ban_reason: string | null
  banned_until: string | null
  is_muted: boolean
  mute_type: string | null
  mute_reason: string | null
  muted_until: string | null
}

type IpHistory = {
  ip_address: string
  first_seen: string
  last_seen: string
  access_count: number
}
// </CHANGE>

export function AdminUserList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<number | null>(null)
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const [ipHistory, setIpHistory] = useState<Record<number, IpHistory[]>>({})
  const [loadingIpHistory, setLoadingIpHistory] = useState<Record<number, boolean>>({})
  // </CHANGE>

  const [muteType, setMuteType] = useState<"temporary" | "permanent">("temporary")
  const [muteDuration, setMuteDuration] = useState("24")
  const [muteTimeUnit, setMuteTimeUnit] = useState<"minutes" | "hours" | "days">("hours")
  const [muteReason, setMuteReason] = useState("")
  const [ipBanType, setIpBanType] = useState<"temporary" | "permanent">("temporary")
  const [ipBanDuration, setIpBanDuration] = useState("24")
  const [ipBanTimeUnit, setIpBanTimeUnit] = useState<"minutes" | "hours" | "days">("hours")
  const [ipBanReason, setIpBanReason] = useState("")

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      const data = await response.json()
      if (Array.isArray(data)) {
        setUsers(data)
      } else {
        console.error("Error fetching users:", data.error || "Invalid response")
        setUsers([])
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchIpHistory = async (userId: number) => {
    setLoadingIpHistory((prev) => ({ ...prev, [userId]: true }))
    try {
      const response = await fetch(`/api/admin/users/${userId}/ip-history`)
      const data = await response.json()
      setIpHistory((prev) => ({ ...prev, [userId]: data }))
    } catch (error) {
      console.error("Error fetching IP history:", error)
    } finally {
      setLoadingIpHistory((prev) => ({ ...prev, [userId]: false }))
    }
  }

  const handleEditUser = (userId: number, username: string) => {
    setEditingUser(userId)
    setNewUsername(username)
    // Fetch IP history when editing user
    if (!ipHistory[userId]) {
      fetchIpHistory(userId)
    }
  }
  // </CHANGE>

  const handleUpdateUsername = async (userId: number) => {
    const response = await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, username: newUsername }),
    })

    if (response.ok) {
      alert("Username updated successfully")
      fetchUsers()
      setEditingUser(null)
    } else {
      alert("Failed to update username")
    }
  }

  const handleUpdatePassword = async (userId: number) => {
    const response = await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, password: newPassword }),
    })

    if (response.ok) {
      alert("Password updated successfully")
      setNewPassword("")
    } else {
      alert("Failed to update password")
    }
  }

  const handleMuteUser = async (userId: number) => {
    if (!muteReason.trim()) {
      alert("Please provide a mute reason")
      return
    }

    let durationInHours = Number.parseInt(muteDuration)
    if (muteTimeUnit === "minutes") {
      durationInHours = durationInHours / 60
    } else if (muteTimeUnit === "days") {
      durationInHours = durationInHours * 24
    }

    const response = await fetch("/api/admin/moderation/mute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        muteType,
        duration: muteType === "temporary" ? durationInHours : null,
        reason: muteReason,
      }),
    })

    if (response.ok) {
      alert("User muted successfully")
      fetchUsers()
      setMuteReason("")
    } else {
      const error = await response.json()
      alert(`Failed to mute user: ${error.error}`)
    }
  }

  const handleUnmuteUser = async (userId: number) => {
    const response = await fetch("/api/admin/moderation/unmute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })

    if (response.ok) {
      alert("User unmuted successfully")
      fetchUsers()
    } else {
      alert("Failed to unmute user")
    }
  }

  const handleIpBan = async (ipAddress: string) => {
    if (!ipBanReason.trim()) {
      alert("Please provide an IP ban reason")
      return
    }

    let durationInHours = Number.parseInt(ipBanDuration)
    if (ipBanTimeUnit === "minutes") {
      durationInHours = durationInHours / 60
    } else if (ipBanTimeUnit === "days") {
      durationInHours = durationInHours * 24
    }

    const response = await fetch("/api/admin/moderation/ip-ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ipAddress,
        banType: ipBanType,
        duration: ipBanType === "temporary" ? durationInHours : null,
        reason: ipBanReason,
      }),
    })

    if (response.ok) {
      alert("IP banned successfully")
      fetchUsers()
      setIpBanReason("")
    } else {
      const error = await response.json()
      alert(`Failed to ban IP: ${error.error}`)
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading users...</div>
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <Card key={user.id} className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">
                    {editingUser === user.id ? (
                      <Input
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder={user.username}
                        className="w-64"
                      />
                    ) : (
                      user.username
                    )}
                  </p>
                  {user.is_muted && (
                    <Badge variant="secondary">{user.mute_type === "permanent" ? "MUTED" : "TEMP MUTE"}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">ID: {user.id}</p>
                <p className="text-sm text-muted-foreground">IP: {user.ip_address}</p>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(user.created_at).toLocaleDateString()}
                </p>
                {user.is_muted && user.mute_reason && (
                  <p className="text-sm text-orange-500">Mute Reason: {user.mute_reason}</p>
                )}
                {user.is_muted && user.muted_until && user.mute_type === "temporary" && (
                  <p className="text-sm text-orange-500">Muted Until: {new Date(user.muted_until).toLocaleString()}</p>
                )}
              </div>

              <div className="flex gap-2">
                {editingUser === user.id ? (
                  <>
                    <Button onClick={() => handleUpdateUsername(user.id)} size="sm">
                      Save Username
                    </Button>
                    <Button onClick={() => setEditingUser(null)} variant="outline" size="sm">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => handleEditUser(user.id, user.username)} size="sm">
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {editingUser === user.id && (
              <div className="space-y-6 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="text-blue-500">IP Address History</Label>
                  {loadingIpHistory[user.id] ? (
                    <p className="text-sm text-muted-foreground">Loading IP history...</p>
                  ) : ipHistory[user.id] && ipHistory[user.id].length > 0 ? (
                    <div className="space-y-2">
                      {ipHistory[user.id].map((ip, index) => (
                        <div key={index} className="p-3 bg-muted rounded-md">
                          <p className="text-sm font-mono font-semibold">{ip.ip_address}</p>
                          <p className="text-xs text-muted-foreground">
                            First seen: {new Date(ip.first_seen).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last seen: {new Date(ip.last_seen).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Access count: {ip.access_count}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No IP history available</p>
                  )}
                </div>
                {/* </CHANGE> */}

                <div className="space-y-2">
                  <Label>Update Password</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      className="w-64"
                    />
                    <Button onClick={() => handleUpdatePassword(user.id)} size="sm">
                      Update Password
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-orange-500">Mute Management</Label>
                  {user.is_muted ? (
                    <Button onClick={() => handleUnmuteUser(user.id)} variant="outline" size="sm">
                      Unmute User
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Select value={muteType} onValueChange={(v: any) => setMuteType(v)}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="temporary">Temporary Mute</SelectItem>
                          <SelectItem value="permanent">Permanent Mute</SelectItem>
                        </SelectContent>
                      </Select>
                      {muteType === "temporary" && (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={muteDuration}
                            onChange={(e) => setMuteDuration(e.target.value)}
                            placeholder="Duration"
                            className="w-32"
                          />
                          <Select value={muteTimeUnit} onValueChange={(v: any) => setMuteTimeUnit(v)}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutes">Minutes</SelectItem>
                              <SelectItem value="hours">Hours</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <Textarea
                        value={muteReason}
                        onChange={(e) => setMuteReason(e.target.value)}
                        placeholder="Mute reason (required)"
                        className="w-full"
                      />
                      <Button onClick={() => handleMuteUser(user.id)} variant="secondary" size="sm">
                        Mute User
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-red-700">IP Ban Management</Label>
                  <div className="space-y-2">
                    <Select value={ipBanType} onValueChange={(v: any) => setIpBanType(v)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="temporary">Temporary IP Ban</SelectItem>
                        <SelectItem value="permanent">Permanent IP Ban</SelectItem>
                      </SelectContent>
                    </Select>
                    {ipBanType === "temporary" && (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={ipBanDuration}
                          onChange={(e) => setIpBanDuration(e.target.value)}
                          placeholder="Duration"
                          className="w-32"
                        />
                        <Select value={ipBanTimeUnit} onValueChange={(v: any) => setIpBanTimeUnit(v)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Minutes</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Textarea
                      value={ipBanReason}
                      onChange={(e) => setIpBanReason(e.target.value)}
                      placeholder="IP ban reason (required)"
                      className="w-full"
                    />
                    <Button onClick={() => handleIpBan(user.ip_address)} variant="destructive" size="sm">
                      Ban IP Address
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
