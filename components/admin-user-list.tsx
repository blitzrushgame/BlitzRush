"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

type User = {
  id: number
  username: string
  ip_address: string
  created_at: string
}

export function AdminUserList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<number | null>(null)
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")

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
      fetchUsers() // Refresh users instead of full page reload
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

  if (loading) {
    return <div className="text-muted-foreground">Loading users...</div>
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <Card key={user.id} className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
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
              <p className="text-sm text-muted-foreground">ID: {user.id}</p>
              <p className="text-sm text-muted-foreground">IP: {user.ip_address}</p>
              <p className="text-sm text-muted-foreground">Created: {new Date(user.created_at).toLocaleDateString()}</p>
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
            <div className="mt-4 pt-4 border-t space-y-2">
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
          )}
        </Card>
      ))}
    </div>
  )
}
