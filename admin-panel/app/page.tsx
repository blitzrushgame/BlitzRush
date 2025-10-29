import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AdminTabs } from "@/components/admin-tabs"

export default async function AdminPage() {
  const cookieStore = await cookies()
  const adminAuthCookie = cookieStore.get("admin_authenticated")

  const isAdminAuthenticated = adminAuthCookie?.value === "true"

  if (!isAdminAuthenticated) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">BlitzRush Admin Panel</h1>
        <AdminTabs />
      </div>
    </div>
  )
}
