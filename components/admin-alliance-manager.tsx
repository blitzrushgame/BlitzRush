"use client"

import { useState, useEffect } from "react"
import { Shield, Trash2, Edit, UserPlus, UserMinus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Alliance {
  id: number
  name: string
  tag: string
  description: string | null
  leader_id: number
  created_at: string
  alliance_members: Array<{
    id: number
    user_id: number
    role: string
    joined_at: string
    users: {
      id: number
      username: string
    }
  }>
}

export function AdminAllianceManager() {
  const [alliances, setAlliances] = useState<Alliance[]>([])
  const [loading, setLoading] = useState(true)
  const [editingAlliance, setEditingAlliance] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: "", tag: "", description: "" })
  const [addMemberForm, setAddMemberForm] = useState<{ allianceId: number | null; username: string }>({
    allianceId: null,
    username: "",
  })

  useEffect(() => {
    loadAlliances()
  }, [])

  const loadAlliances = async () => {
    setLoading(true)
    const response = await fetch("/api/admin/alliances")
    const data = await response.json()
    if (response.ok) {
      setAlliances(data.alliances || [])
    }
    setLoading(false)
  }

  const handleEditAlliance = async (allianceId: number) => {
    const response = await fetch("/api/admin/alliances/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allianceId,
        name: editForm.name,
        tag: editForm.tag,
        description: editForm.description,
      }),
    })

    if (response.ok) {
      alert("Alliance updated successfully")
      setEditingAlliance(null)
      loadAlliances()
    } else {
      const data = await response.json()
      alert(data.error || "Failed to update alliance")
    }
  }

  const handleDeleteAlliance = async (allianceId: number, allianceName: string) => {
    if (!confirm(`Are you sure you want to delete the alliance "${allianceName}"? This cannot be undone.`)) return

    const response = await fetch("/api/admin/alliances/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allianceId }),
    })

    if (response.ok) {
      alert("Alliance deleted successfully")
      loadAlliances()
    } else {
      const data = await response.json()
      alert(data.error || "Failed to delete alliance")
    }
  }

  const handleAddMember = async () => {
    if (!addMemberForm.allianceId || !addMemberForm.username) {
      alert("Please enter a username")
      return
    }

    const response = await fetch("/api/admin/alliances/manage-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        allianceId: addMemberForm.allianceId,
        username: addMemberForm.username,
      }),
    })

    if (response.ok) {
      alert("Member added successfully")
      setAddMemberForm({ allianceId: null, username: "" })
      loadAlliances()
    } else {
      const data = await response.json()
      alert(data.error || "Failed to add member")
    }
  }

  const handleRemoveMember = async (allianceId: number, userId: number, username: string) => {
    if (!confirm(`Are you sure you want to remove ${username} from this alliance?`)) return

    const response = await fetch("/api/admin/alliances/manage-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "remove",
        allianceId,
        userId,
      }),
    })

    if (response.ok) {
      alert("Member removed successfully")
      loadAlliances()
    } else {
      const data = await response.json()
      alert(data.error || "Failed to remove member")
    }
  }

  const startEdit = (alliance: Alliance) => {
    setEditingAlliance(alliance.id)
    setEditForm({
      name: alliance.name,
      tag: alliance.tag,
      description: alliance.description || "",
    })
  }

  if (loading) {
    return <div className="text-center py-8">Loading alliances...</div>
  }

  return (
    <div className="space-y-6">
      {alliances.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">No alliances found</div>
      ) : (
        alliances.map((alliance) => (
          <div key={alliance.id} className="border rounded-lg p-6 space-y-4">
            {editingAlliance === alliance.id ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Alliance Name</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Alliance name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tag</label>
                  <Input
                    value={editForm.tag}
                    onChange={(e) => setEditForm({ ...editForm, tag: e.target.value })}
                    placeholder="Tag"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Description"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleEditAlliance(alliance.id)}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setEditingAlliance(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="text-xl font-bold">
                        [{alliance.tag}] {alliance.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{alliance.description || "No description"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(alliance.created_at).toLocaleDateString()} | Members:{" "}
                        {alliance.alliance_members.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(alliance)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteAlliance(alliance.id, alliance.name)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Members ({alliance.alliance_members.length})</h4>
                  <div className="space-y-2">
                    {alliance.alliance_members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between bg-muted/50 rounded p-3">
                        <div>
                          <span className="font-medium">{member.users.username}</span>
                          <span className="text-sm text-muted-foreground ml-3">({member.role})</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(alliance.id, member.user_id, member.users.username)}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    {addMemberForm.allianceId === alliance.id ? (
                      <>
                        <Input
                          placeholder="Enter username to add"
                          value={addMemberForm.username}
                          onChange={(e) => setAddMemberForm({ ...addMemberForm, username: e.target.value })}
                          onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                        />
                        <Button onClick={handleAddMember}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add
                        </Button>
                        <Button variant="outline" onClick={() => setAddMemberForm({ allianceId: null, username: "" })}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddMemberForm({ allianceId: alliance.id, username: "" })}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Member
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  )
}
