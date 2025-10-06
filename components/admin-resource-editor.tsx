"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface User {
  id: number
  username: string
}

interface Resources {
  concrete: number
  steel: number
  carbon: number
  fuel: number
}

export function AdminResourceEditor() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [resources, setResources] = useState<Resources>({
    concrete: 0,
    steel: 0,
    carbon: 0,
    fuel: 0,
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (selectedUserId) {
      fetchUserResources(selectedUserId)
    }
  }, [selectedUserId])

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
    }
  }

  const fetchUserResources = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/resources/${userId}`)
      const data = await response.json()
      if (data.resources) {
        setResources(data.resources)
      }
    } catch (error) {
      console.error("Error fetching resources:", error)
    }
  }

  const updateResources = async () => {
    if (!selectedUserId) {
      setMessage("Please select a user")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          resources,
        }),
      })

      if (response.ok) {
        setMessage("Resources updated successfully!")
        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage("Failed to update resources")
      }
    } catch (error) {
      console.error("Error updating resources:", error)
      setMessage("Error updating resources")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 max-w-2xl">
      <div className="space-y-6">
        <div>
          <Label htmlFor="user-select">Select User</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger id="user-select" className="w-full mt-2">
              <SelectValue placeholder="Choose a user..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.username} (ID: {user.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUserId && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="concrete">Concrete</Label>
                <Input
                  id="concrete"
                  type="number"
                  value={resources.concrete}
                  onChange={(e) => setResources({ ...resources, concrete: Number.parseInt(e.target.value) || 0 })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="steel">Steel</Label>
                <Input
                  id="steel"
                  type="number"
                  value={resources.steel}
                  onChange={(e) => setResources({ ...resources, steel: Number.parseInt(e.target.value) || 0 })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="carbon">Carbon</Label>
                <Input
                  id="carbon"
                  type="number"
                  value={resources.carbon}
                  onChange={(e) => setResources({ ...resources, carbon: Number.parseInt(e.target.value) || 0 })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="fuel">Fuel</Label>
                <Input
                  id="fuel"
                  type="number"
                  value={resources.fuel}
                  onChange={(e) => setResources({ ...resources, fuel: Number.parseInt(e.target.value) || 0 })}
                  className="mt-2"
                />
              </div>
            </div>

            <Button onClick={updateResources} disabled={loading} className="w-full">
              {loading ? "Updating..." : "Update Resources"}
            </Button>

            {message && (
              <div
                className={`text-center p-2 rounded ${
                  message.includes("success") ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                }`}
              >
                {message}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
