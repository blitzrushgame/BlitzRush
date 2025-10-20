"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminUserList } from "@/components/admin-user-list"
import { AdminChatHistory } from "@/components/admin-chat-history"
import { AdminResourceEditor } from "@/components/admin-resource-editor"
import { AdminAllianceManager } from "@/components/admin-alliance-manager"
import { AdminIPBanManager } from "@/components/admin-ban-manager"


export function AdminTabs() {
  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full grid-cols-5 mb-8">
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="chats">Chats</TabsTrigger>
        <TabsTrigger value="values">Values</TabsTrigger>
        <TabsTrigger value="alliances">Alliances</TabsTrigger>
        <TabsTrigger value="ip-bans">IP Bans</TabsTrigger>
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

      <TabsContent value="values">
        <div className="space-y-4">
          <p className="text-muted-foreground">Edit player resources and values</p>
          <AdminResourceEditor />
        </div>
      </TabsContent>

      <TabsContent value="alliances">
        <div className="space-y-4">
          <p className="text-muted-foreground">Manage alliances, edit names/tags, and moderate content</p>
          <AdminAllianceManager />
        </div>
      </TabsContent>

      <TabsContent value="ip-bans">
        <div className="space-y-4">
          <p className="text-muted-foreground mb-2">Manage banned IPs</p>
          <AdminIPBanManager />
        </div>
      </TabsContent>
    </Tabs>
  )
}
