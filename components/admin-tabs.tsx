"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminUserList } from "@/components/admin-user-list"
import { AdminChatHistory } from "@/components/admin-chat-history"
import { AdminAllianceManager } from "@/components/admin-alliance-manager"
import { useEffect } from "react"

export function AdminTabs() {
  useEffect(() => {
    console.log("[v0] AdminTabs component mounted")
  }, [])

  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-8 bg-orange-600/20 border border-orange-500/30">
        <TabsTrigger value="users" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
          Users
        </TabsTrigger>
        <TabsTrigger value="chats" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
          Chats
        </TabsTrigger>
        <TabsTrigger value="alliances" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
          Alliances
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users">
        <div className="space-y-4">
          <p className="text-muted-foreground">View and edit user accounts for support purposes</p>
          <AdminUserList />
        </div>
      </TabsContent>

      <TabsContent value="chats">
        <div className="space-y-4">
          <p className="text-muted-foreground">View chat history across all channels</p>
          <AdminChatHistory />
        </div>
      </TabsContent>

      <TabsContent value="alliances">
        <div className="space-y-4">
          <p className="text-muted-foreground">Manage alliances, edit names/tags, and moderate content</p>
          <AdminAllianceManager />
        </div>
      </TabsContent>
    </Tabs>
  )
}
