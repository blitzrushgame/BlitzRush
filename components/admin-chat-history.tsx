"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface GlobalMessage {
  id: number
  username: string
  message: string
  created_at: string
}

interface AllianceMessage {
  id: number
  username: string
  alliance_id: number
  message: string
  created_at: string
}

interface PrivateMessage {
  id: number
  sender_username: string
  recipient_username: string
  message: string
  created_at: string
}

export function AdminChatHistory() {
  const [globalMessages, setGlobalMessages] = useState<GlobalMessage[]>([])
  const [allianceMessages, setAllianceMessages] = useState<AllianceMessage[]>([])
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChatHistory()
  }, [])

  const fetchChatHistory = async () => {
    try {
      const [globalRes, allianceRes, privateRes] = await Promise.all([
        fetch("/api/admin/chats/global"),
        fetch("/api/admin/chats/alliance"),
        fetch("/api/admin/chats/private"),
      ])

      const [global, alliance, private_] = await Promise.all([globalRes.json(), allianceRes.json(), privateRes.json()])

      setGlobalMessages(Array.isArray(global) ? global : [])
      setAllianceMessages(Array.isArray(alliance) ? alliance : [])
      setPrivateMessages(Array.isArray(private_) ? private_ : [])
    } catch (error) {
      console.error("Error fetching chat history:", error)
      setGlobalMessages([])
      setAllianceMessages([])
      setPrivateMessages([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading chat history...</div>
  }

  return (
    <Tabs defaultValue="global" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="global">Global ({globalMessages.length})</TabsTrigger>
        <TabsTrigger value="alliance">Alliance ({allianceMessages.length})</TabsTrigger>
        <TabsTrigger value="private">Private ({privateMessages.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="global">
        <Card className="p-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {globalMessages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No global messages yet</p>
              ) : (
                globalMessages.map((msg) => (
                  <div key={msg.id} className="border-b border-border pb-3">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-amber-500">{msg.username}</span>
                      <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </TabsContent>

      <TabsContent value="alliance">
        <Card className="p-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {allianceMessages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No alliance messages yet</p>
              ) : (
                allianceMessages.map((msg) => (
                  <div key={msg.id} className="border-b border-border pb-3">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-amber-500">{msg.username}</span>
                      <span className="text-xs text-blue-400">Alliance {msg.alliance_id}</span>
                      <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </TabsContent>

      <TabsContent value="private">
        <Card className="p-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {privateMessages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No private messages yet</p>
              ) : (
                privateMessages.map((msg) => (
                  <div key={msg.id} className="border-b border-border pb-3">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-amber-500">{msg.sender_username}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-semibold text-green-500">{msg.recipient_username}</span>
                      <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
