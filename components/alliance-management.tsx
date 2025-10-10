"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Shield, Crown, Users, Settings, UserMinus, UserPlus, Newspaper, LogOut } from "lucide-react"

interface Alliance {
  id: number
  name: string
  tag: string
  description: string | null
  leader_id: number
  created_at: string
  total_points: number
  total_bases: number
  member_count: number
  max_members: number
  is_public: boolean
  min_points_required: number
}

interface Member {
  id: number
  alliance_id: number
  user_id: number
  role: string
  joined_at: string
  users: {
    id: number
    username: string
    created_at: string
  }
}

interface JoinRequest {
  id: number
  alliance_id: number
  user_id: number
  message: string | null
  status: string
  created_at: string
  users: {
    id: number
    username: string
  }
}

interface NewsPost {
  id: number
  alliance_id: number
  author_id: number
  author_username: string
  title: string
  content: string
  created_at: string
}

interface AllianceManagementProps {
  alliance: Alliance
  members: Member[]
  currentUserRole: string
  currentUserId: number
  joinRequests: JoinRequest[]
}

export default function AllianceManagement({
  alliance,
  members,
  currentUserRole,
  currentUserId,
  joinRequests,
}: AllianceManagementProps) {
  const [activeTab, setActiveTab] = useState<"news" | "members" | "requests" | "invite" | "settings">("news")
  const [newsletter, setNewsletter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [inviteMessage, setInviteMessage] = useState("")
  const [settingsDescription, setSettingsDescription] = useState(alliance.description || "")
  const [settingsMinPoints, setSettingsMinPoints] = useState(alliance.min_points_required)
  const [settingsIsPublic, setSettingsIsPublic] = useState(alliance.is_public)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([])
  const [newsTitle, setNewsTitle] = useState("")
  const [newsContent, setNewsContent] = useState("")
  const [isPostingNews, setIsPostingNews] = useState(false)

  const isLeader = currentUserRole === "leader"
  const isCoLeader = currentUserRole === "co-leader"
  const canManage = isLeader || isCoLeader

  useEffect(() => {
    fetchNewsPosts()
  }, [])

  const fetchNewsPosts = async () => {
    const response = await fetch("/api/alliance/news")
    if (response.ok) {
      const data = await response.json()
      setNewsPosts(data.posts || [])
    }
  }

  const handlePromoteToCoLeader = async (userId: number) => {
    const response = await fetch("/api/alliance/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: "co-leader" }),
    })

    if (response.ok) {
      window.location.reload()
    }
  }

  const handleDemoteFromCoLeader = async (userId: number) => {
    const response = await fetch("/api/alliance/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: "member" }),
    })

    if (response.ok) {
      window.location.reload()
    }
  }

  const handleKickMember = async (userId: number) => {
    if (!confirm("Are you sure you want to kick this member?")) return

    const response = await fetch("/api/alliance/kick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })

    if (response.ok) {
      window.location.reload()
    }
  }

  const handleLeaveAlliance = async () => {
    if (!confirm("Are you sure you want to leave this alliance?")) return

    const response = await fetch("/api/alliance/leave", {
      method: "POST",
    })

    if (response.ok) {
      window.location.href = "/alliance"
    }
  }

  const handleDisbandAlliance = async () => {
    if (
      !confirm(
        "Are you sure you want to disband this alliance? This will remove all members and delete the alliance permanently. This action cannot be undone.",
      )
    )
      return

    const response = await fetch("/api/alliance/disband", {
      method: "POST",
    })

    if (response.ok) {
      alert("Alliance disbanded successfully")
      window.location.href = "/alliance"
    } else {
      const data = await response.json()
      alert(data.error || "Failed to disband alliance")
    }
  }

  const handleApproveRequest = async (requestId: number, userId: number) => {
    const response = await fetch("/api/alliance/approve-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, userId, action: "approve" }),
    })

    if (response.ok) {
      window.location.reload()
    }
  }

  const handleRejectRequest = async (requestId: number) => {
    const response = await fetch("/api/alliance/approve-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action: "reject" }),
    })

    if (response.ok) {
      window.location.reload()
    }
  }

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query)

    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const response = await fetch(`/api/alliance/search-users?q=${encodeURIComponent(query)}`)
    const data = await response.json()

    if (response.ok) {
      setSearchResults(data.users || [])
    }
    setIsSearching(false)
  }

  const handleSendInvite = async (userId: number) => {
    const response = await fetch("/api/alliance/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, message: inviteMessage }),
    })

    if (response.ok) {
      alert("Invite sent successfully!")
      setSearchQuery("")
      setSearchResults([])
      setInviteMessage("")
    } else {
      const data = await response.json()
      alert(data.error || "Failed to send invite")
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingSettings(true)

    const response = await fetch("/api/alliance/update-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: settingsDescription,
        minPointsRequired: settingsMinPoints,
        isPublic: settingsIsPublic,
      }),
    })

    if (response.ok) {
      alert("Settings saved successfully!")
      window.location.reload()
    } else {
      const data = await response.json()
      alert(data.error || "Failed to save settings")
    }

    setIsSavingSettings(false)
  }

  const handleCreateNewsPost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsTitle.trim() || !newsContent.trim()) return

    setIsPostingNews(true)
    const response = await fetch("/api/alliance/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newsTitle, content: newsContent }),
    })

    if (response.ok) {
      setNewsTitle("")
      setNewsContent("")
      fetchNewsPosts()
    } else {
      const data = await response.json()
      alert(data.error || "Failed to create post")
    }
    setIsPostingNews(false)
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Shield className="w-12 h-12 text-amber-400" />
              <div>
                <h1 className="text-4xl font-bold text-amber-400">
                  [{alliance.tag}] {alliance.name}
                </h1>
                <p className="text-neutral-400 mt-1">{alliance.description || "No description"}</p>
              </div>
            </div>
            <div className="flex gap-3">
              {!isLeader && !isCoLeader && (
                <button
                  onClick={handleLeaveAlliance}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded text-red-400 transition-all flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Leave Alliance
                </button>
              )}
              <a
                href="/alliance/leaderboard"
                className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 rounded text-amber-400 transition-all"
              >
                Alliance Leaderboard
              </a>
              <a
                href="/game"
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 border border-amber-500/30 rounded text-amber-400 transition-all"
              >
                Back to Game
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
              <div className="text-neutral-400 text-sm">Total Points</div>
              <div className="text-2xl font-bold text-amber-400">{alliance.total_points.toLocaleString()}</div>
            </div>
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
              <div className="text-neutral-400 text-sm">Total Bases</div>
              <div className="text-2xl font-bold text-amber-400">{alliance.total_bases}</div>
            </div>
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
              <div className="text-neutral-400 text-sm">Members</div>
              <div className="text-2xl font-bold text-amber-400">
                {alliance.member_count} / {alliance.max_members}
              </div>
            </div>
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
              <div className="text-neutral-400 text-sm">Created</div>
              <div className="text-lg font-bold text-amber-400">
                {new Date(alliance.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-neutral-700">
          <button
            onClick={() => setActiveTab("news")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === "news"
                ? "text-amber-400 border-b-2 border-amber-400"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Newspaper className="w-4 h-4 inline mr-2" />
            News
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === "members"
                ? "text-amber-400 border-b-2 border-amber-400"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Members
          </button>
          {canManage && (
            <>
              <button
                onClick={() => setActiveTab("requests")}
                className={`px-6 py-3 font-semibold transition-all relative ${
                  activeTab === "requests"
                    ? "text-amber-400 border-b-2 border-amber-400"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <UserPlus className="w-4 h-4 inline mr-2" />
                Join Requests
                {joinRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {joinRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("invite")}
                className={`px-6 py-3 font-semibold transition-all ${
                  activeTab === "invite"
                    ? "text-amber-400 border-b-2 border-amber-400"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <UserPlus className="w-4 h-4 inline mr-2" />
                Invite Players
              </button>
            </>
          )}
          {isLeader && (
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === "settings"
                  ? "text-amber-400 border-b-2 border-amber-400"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Settings
            </button>
          )}
        </div>

        {/* Content */}
        {activeTab === "news" && (
          <div className="space-y-6">
            {canManage && (
              <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-amber-400 mb-4">Create News Post</h2>
                <form onSubmit={handleCreateNewsPost} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-300 mb-2">Title</label>
                    <input
                      type="text"
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                      placeholder="Enter post title..."
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-neutral-100 focus:border-amber-500 focus:outline-none"
                      maxLength={100}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-300 mb-2">Content</label>
                    <textarea
                      value={newsContent}
                      onChange={(e) => setNewsContent(e.target.value)}
                      placeholder="Enter post content..."
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-neutral-100 focus:border-amber-500 focus:outline-none"
                      rows={6}
                      maxLength={1000}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isPostingNews}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPostingNews ? "Posting..." : "Post News"}
                  </button>
                </form>
              </div>
            )}

            <div className="space-y-4">
              {newsPosts.length === 0 ? (
                <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-8 text-center text-neutral-400">
                  No news posts yet. {canManage && "Create the first post above!"}
                </div>
              ) : (
                newsPosts.map((post) => (
                  <div key={post.id} className="bg-neutral-800 border border-neutral-700 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-amber-400">{post.title}</h3>
                      <span className="text-neutral-500 text-sm">{new Date(post.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-neutral-300 whitespace-pre-wrap mb-3">{post.content}</p>
                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                      <Crown className="w-4 h-4" />
                      <span>Posted by {post.author_username}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-neutral-900 border-b border-neutral-700">
                <tr>
                  <th className="text-left p-4 text-amber-400">Username</th>
                  <th className="text-left p-4 text-amber-400">Role</th>
                  <th className="text-left p-4 text-amber-400">Joined</th>
                  {canManage && <th className="text-right p-4 text-amber-400">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-neutral-700 hover:bg-neutral-750">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {member.role === "leader" && <Crown className="w-4 h-4 text-amber-400" />}
                        {member.role === "co-leader" && <Shield className="w-4 h-4 text-amber-400" />}
                        <span className="font-semibold">{member.users.username}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          member.role === "leader"
                            ? "bg-amber-500/20 text-amber-400"
                            : member.role === "co-leader"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-neutral-700 text-neutral-300"
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="p-4 text-neutral-400">{new Date(member.joined_at).toLocaleDateString()}</td>
                    {canManage && (
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {isLeader && member.role === "member" && member.user_id !== currentUserId && (
                            <button
                              onClick={() => handlePromoteToCoLeader(member.user_id)}
                              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm transition-all"
                            >
                              Promote to Co-Leader
                            </button>
                          )}
                          {isLeader && member.role === "co-leader" && (
                            <button
                              onClick={() => handleDemoteFromCoLeader(member.user_id)}
                              className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded text-sm transition-all"
                            >
                              Demote to Member
                            </button>
                          )}
                          {member.role !== "leader" && member.user_id !== currentUserId && (
                            <button
                              onClick={() => handleKickMember(member.user_id)}
                              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-all"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "requests" && canManage && (
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6">
            {joinRequests.length === 0 ? (
              <div className="text-center text-neutral-400 py-8">No pending join requests</div>
            ) : (
              <div className="space-y-4">
                {joinRequests.map((request) => (
                  <div key={request.id} className="bg-neutral-900 border border-neutral-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-lg">{request.users.username}</div>
                        {request.message && <div className="text-neutral-400 text-sm mt-1">{request.message}</div>}
                        <div className="text-neutral-500 text-xs mt-2">
                          {new Date(request.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveRequest(request.id, request.user_id)}
                          className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "invite" && canManage && (
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">Invite Players to Alliance</h2>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-300 mb-2">Search for players</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                placeholder="Enter username..."
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-neutral-100 focus:border-amber-500 focus:outline-none"
              />
              {isSearching && <div className="text-neutral-400 text-sm mt-2">Searching...</div>}
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-lg">{user.username}</div>
                      <div className="text-neutral-400 text-sm">{user.points.toLocaleString()} points</div>
                    </div>
                    <button
                      onClick={() => handleSendInvite(user.id)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded transition-all"
                    >
                      Send Invite
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="text-center text-neutral-400 py-8">
                No available players found. Players who have blocked invites will not appear in search results.
              </div>
            )}

            {searchQuery.length < 2 && (
              <div className="text-center text-neutral-400 py-8">Enter at least 2 characters to search for players</div>
            )}
          </div>
        )}

        {activeTab === "settings" && isLeader && (
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">Alliance Settings</h2>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2">Alliance Description</label>
                <textarea
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 focus:border-amber-500 focus:outline-none"
                  rows={4}
                  value={settingsDescription}
                  onChange={(e) => setSettingsDescription(e.target.value)}
                  placeholder="Enter alliance description..."
                  maxLength={500}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2">Minimum Points Required</label>
                <input
                  type="number"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 focus:border-amber-500 focus:outline-none"
                  value={settingsMinPoints}
                  onChange={(e) => setSettingsMinPoints(Number.parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={settingsIsPublic}
                  onChange={(e) => setSettingsIsPublic(e.target.checked)}
                  className="w-5 h-5 accent-amber-500"
                />
                <label htmlFor="is_public" className="text-neutral-300">
                  Public Alliance (anyone can join without approval)
                </label>
              </div>
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingSettings ? "Saving..." : "Save Settings"}
              </button>

              <div className="border-t border-neutral-700 pt-6 mt-8">
                <h3 className="text-xl font-bold text-red-400 mb-3">Danger Zone</h3>
                <p className="text-neutral-400 text-sm mb-4">
                  Disbanding the alliance will permanently delete it and remove all members. This action cannot be
                  undone.
                </p>
                <button
                  type="button"
                  onClick={handleDisbandAlliance}
                  className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded border border-red-500/50 transition-all"
                >
                  Disband Alliance
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
