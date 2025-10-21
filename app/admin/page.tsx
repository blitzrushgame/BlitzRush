import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AdminTabs } from "@/components/admin-tabs"

export default async function AdminPage() {
  const cookieStore = await cookies()
  const adminAuthCookie = cookieStore.get("admin_authenticated")

  console.log("[v0] Admin page - checking authentication")
  console.log("[v0] admin_authenticated cookie:", adminAuthCookie)
  console.log("[v0] Cookie value:", adminAuthCookie?.value)
  console.log(
    "[v0] All cookies:",
    cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
  )

  const isAdminAuthenticated = adminAuthCookie?.value === "true"

  console.log("[v0] Is admin authenticated:", isAdminAuthenticated)

  if (!isAdminAuthenticated) {
    console.log("[v0] Not authenticated, redirecting to login")
    redirect("/admin/login")
  }

  console.log("[v0] Admin authenticated, rendering dashboard")

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-green-500 text-white p-4 mb-4">
          ADMIN DASHBOARD IS RENDERING - If you see this, the page loaded successfully
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-8">Admin Panel</h1>
        <AdminTabs />
      </div>
    </div>
  )
}
