"use client"

import type React from "react"

import { useState } from "react"
import { Shield, Trophy, Users } from "lucide-react"

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

interface AllianceLeaderboardProps {
  alliances: Alliance[]
  currentUserId: number
}

export default function AllianceLeaderboard({ alliances, currentUserId }: AllianceLeaderboardProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [allianceName, setAllianceName] = useState("")
  const [allianceTag, setAllianceTag] = useState("")
  const [allianceDescription, setAllianceDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [minPoints, setMinPoints] = useState(0)
  const [error, setError] = useState("")

  const handleCreateAlliance = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const response = await fetch("/api/alliance/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: allianceName,
        tag: allianceTag,
        description: allianceDescription,
        isPublic,
        minPoints,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      window.location.href = "/alliance"
    } else {
      setError(data.error || "Failed to create alliance")
    }
  }

  const handleJoinAlliance = async (allianceId: number) => {
    const response = await fetch("/api/alliance/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allianceId }),
    })

    if (response.ok) {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Trophy className="w-12 h-12 text-amber-400" />
            <div>
              <h1 className="text-4xl font-bold text-amber-400">Alliance Leaderboard</h1>
              <p className="text-neutral-400 mt-1">Join or create an alliance to compete with others</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded transition-all shadow-lg shadow-amber-500/20"
            >
              Create Alliance
            </button>
            <a
              href="/game"
              className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 border border-amber-500/30 rounded text-amber-400 transition-all"
            >
              Back to Game
            </a>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-900 border-b border-neutral-700">
              <tr>
                <th className="text-left p-4 text-amber-400 w-16">Rank</th>
                <th className="text-left p-4 text-amber-400">Alliance</th>
                <th className="text-left p-4 text-amber-400">Tag</th>
                <th className="text-right p-4 text-amber-400">Points</th>
                <th className="text-right p-4 text-amber-400">Bases</th>
                <th className="text-right p-4 text-amber-400">Members</th>
                <th className="text-right p-4 text-amber-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alliances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-400">
                    No alliances yet. Be the first to create one!
                  </td>
                </tr>
              ) : (
                alliances.map((alliance, index) => (
                  <tr key={alliance.id} className="border-b border-neutral-700 hover:bg-neutral-750">
                    <td className="p-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-700 font-bold">
                        {index === 0 && <span className="text-amber-400">🥇</span>}
                        {index === 1 && <span className="text-neutral-300">🥈</span>}
                        {index === 2 && <span className="text-amber-600">🥉</span>}
                        {index > 2 && <span className="text-neutral-400">{index + 1}</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-amber-400" />
                        <span className="font-semibold">{alliance.name}</span>
                      </div>
                      {alliance.description && (
                        <div className="text-sm text-neutral-400 mt-1">{alliance.description}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-bold">
                        [{alliance.tag}]
                      </span>
                    </td>
                    <td className="p-4 text-right font-semibold">{alliance.total_points.toLocaleString()}</td>
                    <td className="p-4 text-right">{alliance.total_bases}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Users className="w-4 h-4 text-neutral-400" />
                        <span>
                          {alliance.member_count} / {alliance.max_members}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {alliance.member_count < alliance.max_members ? (
                        <button
                          onClick={() => handleJoinAlliance(alliance.id)}
                          className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-all"
                        >
                          {alliance.is_public ? "Join" : "Request to Join"}
                        </button>
                      ) : (
                        <span className="text-neutral-500 text-sm">Full</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Alliance Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-800 border border-amber-500/30 rounded-lg p-8 max-w-2xl w-full">
            <h2 className="text-3xl font-bold text-amber-400 mb-6">Create New Alliance</h2>

            <form onSubmit={handleCreateAlliance} className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded">{error}</div>
              )}

              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2">Alliance Name</label>
                <input
                  type="text"
                  value={allianceName}
                  onChange={(e) => setAllianceName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-neutral-100 focus:border-amber-500 focus:outline-none"
                  placeholder="Enter alliance name..."
                  required
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2">
                  Alliance Tag (2-5 characters)
                </label>
                <input
                  type="text"
                  value={allianceTag}
                  onChange={(e) => setAllianceTag(e.target.value.toUpperCase())}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-neutral-100 focus:border-amber-500 focus:outline-none"
                  placeholder="e.g., PURG"
                  required
                  minLength={2}
                  maxLength={5}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2">Description (Optional)</label>
                <textarea
                  value={allianceDescription}
                  onChange={(e) => setAllianceDescription(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-neutral-100 focus:border-amber-500 focus:outline-none"
                  placeholder="Describe your alliance..."
                  rows={4}
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2">Minimum Points Required</label>
                <input
                  type="number"
                  value={minPoints}
                  onChange={(e) => setMinPoints(Number.parseInt(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-neutral-100 focus:border-amber-500 focus:outline-none"
                  min={0}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 accent-amber-500"
                />
                <label htmlFor="is_public" className="text-neutral-300">
                  Public Alliance (anyone can join without approval)
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded transition-all"
                >
                  Create Alliance
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 font-semibold rounded transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
