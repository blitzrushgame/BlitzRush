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

export function AdminUserList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<number | null>(null)
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const [banType, setBanType] = useState<"temporary" | "permanent">("temporary")
  const [banDuration, setBanDuration] = useState("24") // hours
  const [banReason, setBanReason] = useState("")
  const [muteType, setMuteType] = useState<"temporary" | "permanent">("temporary")
  const [muteDuration, setMuteDuration] = useState("24") // hours
  const [muteReason, setMuteReason] = useState("")
  const [ipBanType, setIpBanType] = useState<"temporary" | "permanent">("temporary")
  const [ipBanDuration, setIpBanDuration] = useState("24") // hours
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

  const handleBanUser = async (userId: number) => {
    if (!banReason.trim()) {
      alert("Please provide a ban reason")
      return
    }

    const response = await fetch("/api/admin/moderation/ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        banType,
        duration: banType === "temporary" ? Number.parseInt(banDuration) : null,
        reason: banReason,
      }),
    })

    if (response.ok) {
      alert("User banned successfully")
      fetchUsers()
      setBanReason("")
    } else {
      const error = await response.json()
      alert(`Failed to ban user: ${error.error}`)
    }
  }

  const handleUnbanUser = async (userId: number) => {
    const response = await fetch("/api/admin/moderation/unban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })

    if (response.ok) {
      alert("User unbanned successfully")
      fetchUsers()
    } else {
      alert("Failed to unban user")
    }
  }

  const handleMuteUser = async (userId: number) => {
    if (!muteReason.trim()) {
      alert("Please provide a mute reason")
      return
    }

    const response = await fetch("/api/admin/moderation/mute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        muteType,
        duration: muteType === "temporary" ? Number.parseInt(muteDuration) : null,
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

    const response = await fetch("/api/admin/moderation/ip-ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ipAddress,
        banType: ipBanType,
        duration: ipBanType === "temporary" ? Number.parseInt(ipBanDuration) : null,
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
                  {user.is_banned && (
                    <Badge variant="destructive">{user.ban_type === "permanent" ? "BANNED" : "TEMP BAN"}</Badge>
                  )}
                  {user.is_muted && (
                    <Badge variant="secondary">{user.mute_type === "permanent" ? "MUTED" : "TEMP MUTE"}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">ID: {user.id}</p>
                <p className="text-sm text-muted-foreground">IP: {user.ip_address}</p>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(user.created_at).toLocaleDateString()}
                </p>
                {user.is_banned && user.ban_reason && (
                  <p className="text-sm text-red-500">Ban Reason: {user.ban_reason}</p>
                )}
                {user.is_banned && user.banned_until && user.ban_type === "temporary" && (
                  <p className="text-sm text-red-500">Banned Until: {new Date(user.banned_until).toLocaleString()}</p>
                )}
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
                  <Button
                    onClick={() => {
                      setEditingUser(user.id)
                      setNewUsername(user.username)
                    }}
                    size="sm"
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {editingUser === user.id && (
              <div className="space-y-6 pt-4 border-t">
                {/* Password Update Section */}
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
                  <Label className="text-red-500">Ban Management</Label>
                  {user.is_banned ? (
                    <Button onClick={() => handleUnbanUser(user.id)} variant="outline" size="sm">
                      Unban User
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Select value={banType} onValueChange={(v: any) => setBanType(v)}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="temporary">Temporary Ban</SelectItem>
                          <SelectItem value="permanent">Permanent Ban</SelectItem>
                        </SelectContent>
                      </Select>
                      {banType === "temporary" && (
                        <Input
                          type="number"
                          value={banDuration}
                          onChange={(e) => setBanDuration(e.target.value)}
                          placeholder="Duration (hours)"
                          className="w-48"
                        />
                      )}
                      <Textarea
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="Ban reason (required)"
                        className="w-full"
                      />
                      <Button onClick={() => handleBanUser(user.id)} variant="destructive" size="sm">
                        Ban User
                      </Button>
                    </div>
                  )}
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
                        <Input
                          type="number"
                          value={muteDuration}
                          onChange={(e) => setMuteDuration(e.target.value)}
                          placeholder="Duration (hours)"
                          className="w-48"
                        />
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
                      <Input
                        type="number"
                        value={ipBanDuration}
                        onChange={(e) => setIpBanDuration(e.target.value)}
                        placeholder="Duration (hours)"
                        className="w-48"
                      />
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
