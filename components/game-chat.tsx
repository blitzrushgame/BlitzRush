"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"

interface Message {
  id: number
  username: string
  message: string
  created_at: string
}

interface GameChatProps {
  userId: number
  username: string
  allianceId?: number
}

export function GameChat({ userId, username, allianceId }: GameChatProps) {
  const [globalMessages, setGlobalMessages] = useState<Message[]>([])
  const [allianceMessages, setAllianceMessages] = useState<Message[]>([])
  const [globalInput, setGlobalInput] = useState("")
  const [allianceInput, setAllianceInput] = useState("")
  const [activeTab, setActiveTab] = useState("global")
  const globalScrollRef = useRef<HTMLDivElement>(null)
  const allianceScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000) // Poll every 3 seconds
    return () => clearInterval(interval)
  }, [allianceId])

  const fetchMessages = async () => {
    try {
      const globalRes = await fetch("/api/chat/global")
      const globalData = await globalRes.json()
      setGlobalMessages(globalData)

      if (allianceId) {
        const allianceRes = await fetch(`/api/chat/alliance?allianceId=${allianceId}`)
        const allianceData = await allianceRes.json()
        setAllianceMessages(allianceData)
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    }
  }

  const sendGlobalMessage = async () => {
    if (!globalInput.trim()) return

    try {
      await fetch("/api/chat/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          username,
          message: globalInput,
        }),
      })
      setGlobalInput("")
      fetchMessages()
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const sendAllianceMessage = async () => {
    if (!allianceInput.trim() || !allianceId) return

    try {
      await fetch("/api/chat/alliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          username,
          allianceId,
          message: allianceInput,
        }),
      })
      setAllianceInput("")
      fetchMessages()
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  return (
    <div className="fixed bottom-4 left-4 w-96 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl">
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
          <ScrollArea className="h-48" ref={globalScrollRef}>
            <div className="space-y-2 pr-3">
              {globalMessages.map((msg) => (
                <div key={msg.id} className="text-xs">
                  <span className="font-semibold text-amber-400">{msg.username}:</span>{" "}
                  <span className="text-neutral-200">{msg.message}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex gap-2">
            <Input
              value={globalInput}
              onChange={(e) => setGlobalInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendGlobalMessage()}
              placeholder="Type message..."
              className="h-8 text-xs bg-neutral-800 border-neutral-700"
            />
            <Button onClick={sendGlobalMessage} size="sm" className="h-8 px-3 bg-amber-600 hover:bg-amber-700">
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="alliance" className="p-3 space-y-2">
          {allianceId ? (
            <>
              <ScrollArea className="h-48" ref={allianceScrollRef}>
                <div className="space-y-2 pr-3">
                  {allianceMessages.map((msg) => (
                    <div key={msg.id} className="text-xs">
                      <span className="font-semibold text-blue-400">{msg.username}:</span>{" "}
                      <span className="text-neutral-200">{msg.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex gap-2">
                <Input
                  value={allianceInput}
                  onChange={(e) => setAllianceInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendAllianceMessage()}
                  placeholder="Type message..."
                  className="h-8 text-xs bg-neutral-800 border-neutral-700"
                />
                <Button onClick={sendAllianceMessage} size="sm" className="h-8 px-3 bg-blue-600 hover:bg-blue-700">
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
              Join an alliance to use alliance chat
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
