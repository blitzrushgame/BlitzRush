"use client"

import type React from "react"

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Trophy, Users, Target, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

interface Message {
  id: number
  username: string
  message: string
  created_at: string
  user_id: number
  alliance_tag?: string | null // Added alliance_tag field
  profile_picture?: string | null // Added profile_picture field
}

interface GameChatProps {
  userId: number
  username: string
  allianceId?: number
}

interface UserProfile {
  id: number
  username: string
  bio: string
  profile_picture: string
  points: number
  leaderboard_rank: number | null
  alliance_name: string | null
  alliance_id: number | null // Added alliance_id field for linking
}

export interface GameChatRef {
  focusGlobalChat: () => void
}

export const GameChat = forwardRef<GameChatRef, GameChatProps>(({ userId, username, allianceId }, ref) => {
  const [globalMessages, setGlobalMessages] = useState<Message[]>([])
  const [allianceMessages, setAllianceMessages] = useState<Message[]>([])
  const [globalInput, setGlobalInput] = useState("")
  const [allianceInput, setAllianceInput] = useState("")
  const [activeTab, setActiveTab] = useState("global")
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date()) // Added currentTime state for live timestamp updates
  const [globalCooldown, setGlobalCooldown] = useState(0) // Added cooldown states
  const [allianceCooldown, setAllianceCooldown] = useState(0)
  const globalScrollRef = useRef<HTMLDivElement>(null)
  const allianceScrollRef = useRef<HTMLDivElement>(null)
  const wasAtBottomRef = useRef({ global: true, alliance: true })
  const globalInputRef = useRef<HTMLInputElement>(null)
  const allianceInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    focusGlobalChat: () => {
      setActiveTab("global")
      setTimeout(() => {
        globalInputRef.current?.focus()
      }, 0)
    },
  }))

  const isScrolledToBottom = (element: HTMLDivElement | null) => {
    if (!element) return true
    const threshold = 100 // pixels from bottom to consider "at bottom"
    const { scrollTop, scrollHeight, clientHeight } = element
    return scrollHeight - scrollTop - clientHeight < threshold
  }

  const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      const scrollElement = ref.current.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [allianceId])

  useEffect(() => {
    if (selectedUserId) {
      loadUserProfile(selectedUserId)
    }
  }, [selectedUserId])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date()) // Added timer to update timestamps every second
      setGlobalCooldown((prev) => Math.max(0, prev - 1)) // Added cooldown timer effect
      setAllianceCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (wasAtBottomRef.current.global) {
      scrollToBottom(globalScrollRef)
    }
  }, [globalMessages])

  useEffect(() => {
    if (wasAtBottomRef.current.alliance) {
      scrollToBottom(allianceScrollRef)
    }
  }, [allianceMessages])

  const loadUserProfile = async (targetUserId: number) => {
    setLoadingProfile(true)
    try {
      const res = await fetch(`/api/profile/${targetUserId}`)
      const data = await res.json()
      setSelectedUserProfile(data)
    } catch (error) {
      console.error("Error loading user profile:", error)
    } finally {
      setLoadingProfile(false)
    }
  }

  const fetchMessages = async () => {
    const globalScrollElement = globalScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLDivElement
    const allianceScrollElement = allianceScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLDivElement

    wasAtBottomRef.current.global = isScrolledToBottom(globalScrollElement)
    wasAtBottomRef.current.alliance = isScrolledToBottom(allianceScrollElement)

    try {
      const globalRes = await fetch("/api/chat/global")
      const globalData = await globalRes.json()
      setGlobalMessages(globalData)

      if (allianceId) {
        const allianceRes = await fetch(`/api/chat/alliance?allianceId=${allianceId}&userId=${userId}`)
        const allianceData = await allianceRes.json()
        setAllianceMessages(allianceData)
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    }
  }

  const sendGlobalMessage = async () => {
    if (!globalInput.trim()) return
    if (globalCooldown > 0) return

    wasAtBottomRef.current.global = true

    try {
      const res = await fetch("/api/chat/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          username,
          message: globalInput,
        }),
      })

      if (res.status === 429) {
        const data = await res.json()
        alert(data.error)
        return
      }

      if (!res.ok) {
        throw new Error("Failed to send message")
      }

      setGlobalInput("")
      setGlobalCooldown(3)
      fetchMessages()
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const sendAllianceMessage = async () => {
    if (!allianceInput.trim() || !allianceId) return
    if (allianceCooldown > 0) return

    wasAtBottomRef.current.alliance = true

    try {
      const res = await fetch("/api/chat/alliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          username,
          allianceId,
          message: allianceInput,
        }),
      })

      if (res.status === 429) {
        const data = await res.json()
        alert(data.error)
        return
      }

      if (!res.ok) {
        throw new Error("Failed to send message")
      }

      setAllianceInput("")
      setAllianceCooldown(3)
      fetchMessages()
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const diffMs = currentTime.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)

    if (diffSecs < 5) return "just now"
    if (diffSecs < 60) return `${diffSecs}s ago`
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  const closeModal = () => {
    setSelectedUserId(null)
    setSelectedUserProfile(null)
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 w-60 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-neutral-800">
            <TabsTrigger value="global" className="text-xs">
              Global
            </TabsTrigger>
            <TabsTrigger value="alliance" className="text-xs" disabled={!allianceId}>
              Alliance {!allianceId && "(Join Alliance)"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="p-3 space-y-2">
            <ScrollArea className="h-64" ref={globalScrollRef}>
              <div className="space-y-2 pr-3">
                {globalMessages.map((msg) => (
                  <div key={msg.id} className="flex gap-2 text-xs">
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarImage src={msg.profile_picture || "/placeholder.svg"} />
                      <AvatarFallback className="bg-neutral-700 text-amber-400 text-[10px]">
                        {msg.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1 flex-wrap">
                        {msg.alliance_tag && <span className="font-bold text-blue-400">[{msg.alliance_tag}]</span>}
                        <button
                          onClick={() => setSelectedUserId(msg.user_id)}
                          className="font-semibold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                        >
                          {msg.username}
                        </button>
                        <span className="text-neutral-400 text-[10px]">({formatTimestamp(msg.created_at)})</span>
                      </div>
                      <span className="text-neutral-200 block break-words">{msg.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                ref={globalInputRef}
                value={globalInput}
                onChange={(e) => setGlobalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendGlobalMessage()}
                placeholder="Type message..."
                className="h-8 text-xs bg-neutral-800 border-neutral-700"
                disabled={globalCooldown > 0}
              />
              <Button
                onClick={sendGlobalMessage}
                size="sm"
                className="h-8 px-3 bg-amber-600 hover:bg-amber-700"
                disabled={globalCooldown > 0}
              >
                {globalCooldown > 0 ? (
                  <span className="text-[10px]">{globalCooldown}s</span>
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="alliance" className="p-3 space-y-2">
            {allianceId ? (
              <>
                <ScrollArea className="h-64" ref={allianceScrollRef}>
                  <div className="space-y-2 pr-3">
                    {allianceMessages.map((msg) => (
                      <div key={msg.id} className="flex gap-2 text-xs">
                        <Avatar className="w-6 h-6 flex-shrink-0">
                          <AvatarImage src={msg.profile_picture || "/placeholder.svg"} />
                          <AvatarFallback className="bg-neutral-700 text-blue-400 text-[10px]">
                            {msg.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1 flex-wrap">
                            <button
                              onClick={() => setSelectedUserId(msg.user_id)}
                              className="font-semibold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                            >
                              {msg.username}
                            </button>
                            <span className="text-neutral-400 text-[10px]">({formatTimestamp(msg.created_at)})</span>
                          </div>
                          <span className="text-neutral-200 block break-words">{msg.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Input
                    ref={allianceInputRef}
                    value={allianceInput}
                    onChange={(e) => setAllianceInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendAllianceMessage()}
                    placeholder="Type message..."
                    className="h-8 text-xs bg-neutral-800 border-neutral-700"
                    disabled={allianceCooldown > 0}
                  />
                  <Button
                    onClick={sendAllianceMessage}
                    size="sm"
                    className="h-8 px-3 bg-blue-600 hover:bg-blue-700"
                    disabled={allianceCooldown > 0}
                  >
                    {allianceCooldown > 0 ? (
                      <span className="text-[10px]">{allianceCooldown}s</span>
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-xs">
                Join an alliance to use alliance chat
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedUserId && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="bg-neutral-900 border-2 border-amber-500/50 rounded-lg p-6 w-[500px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingProfile ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-amber-400">Loading profile...</div>
              </div>
            ) : selectedUserProfile ? (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20 border-2 border-amber-500">
                      <AvatarImage src={selectedUserProfile.profile_picture || "/placeholder.svg"} />
                      <AvatarFallback className="bg-neutral-700 text-amber-400 text-2xl">
                        {selectedUserProfile.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-2xl font-bold text-amber-400">{selectedUserProfile.username}</h2>
                      <div className="flex items-center gap-2 text-neutral-400 text-sm mt-1">
                        <Trophy className="w-3 h-3" />
                        <span>
                          Rank #{selectedUserProfile.leaderboard_rank || "Unranked"} •{" "}
                          {selectedUserProfile.points.toLocaleString()} pts
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={closeModal} className="text-neutral-400 hover:text-neutral-200 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="border-t border-neutral-700 pt-4">
                  <h3 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Biography
                  </h3>
                  <p className="text-neutral-300 text-sm">
                    {selectedUserProfile.bio || "This commander has not set a biography yet."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-800/50 p-4 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <h3 className="text-amber-400 font-semibold text-sm">Points</h3>
                    </div>
                    <p className="text-xl font-bold text-neutral-200">{selectedUserProfile.points.toLocaleString()}</p>
                  </div>

                  <div className="bg-neutral-800/50 p-4 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-amber-400" />
                      <h3 className="text-amber-400 font-semibold text-sm">Rank</h3>
                    </div>
                    <p className="text-xl font-bold text-neutral-200">
                      #{selectedUserProfile.leaderboard_rank || "Unranked"}
                    </p>
                  </div>
                </div>

                <div className="bg-neutral-800/50 p-4 rounded-lg border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <h3 className="text-amber-400 font-semibold text-sm">Alliance</h3>
                  </div>
                  {selectedUserProfile.alliance_name ? (
                    <Link
                      href={`/alliance?view=${selectedUserProfile.alliance_id}`}
                      className="text-lg font-semibold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                      onClick={closeModal}
                    >
                      {selectedUserProfile.alliance_name}
                    </Link>
                  ) : (
                    <p className="text-lg font-semibold text-neutral-200">No Alliance</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-red-400 text-center py-12">Failed to load profile</div>
            )}
          </div>
        </div>
      )}
    </>
  )
})

GameChat.displayName = "GameChat"
