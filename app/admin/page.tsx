import { redirect } from "next/navigation"
import { AdminTabs } from "@/components/admin-tabs"
import { getAdminSession } from "@/lib/admin/auth"
import { Button } from "@/components/ui/button"
import { LogOut, Shield } from "lucide-react"

export default async function AdminPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect("/admin/login")
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-amber-400" />
            <div>
              <h1 className="text-3xl font-bold text-amber-400">Admin Panel</h1>
              <p className="text-neutral-400 text-sm">
                Logged in as <span className="text-amber-400">{session.email}</span>
              </p>
            </div>
          </div>
          <form action="/api/admin/logout" method="POST">
            <Button
              variant="outline"
              className="border-neutral-600 text-neutral-300 hover:bg-neutral-800 bg-transparent"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </form>
        </div>
        <AdminTabs />
      </div>
    </div>
  )
}
