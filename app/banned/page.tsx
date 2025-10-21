import { getCurrentUser } from "@/lib/auth/simple-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { redirect } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { Card } from "@/components/ui/card"

export default async function BannedPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/")
  }

  const supabase = createServiceRoleClient()

  // Check if user is actually banned
  const { data: userData } = await supabase
    .from("users")
    .select("is_banned, ban_type, ban_reason, banned_until")
    .eq("id", user.id)
    .single()

  if (!userData || !userData.is_banned) {
    redirect("/game")
  }

  const isPermanent = userData.ban_type === "permanent"
  const bannedUntil = userData.banned_until ? new Date(userData.banned_until) : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 bg-neutral-900/95 border-red-500/50">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
            <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-red-500">Account Banned</h1>
            <p className="text-neutral-400">Your account has been suspended from accessing the game.</p>
          </div>

          <div className="w-full bg-neutral-800/50 rounded-lg p-6 space-y-4 text-left">
            <div>
              <h3 className="text-sm font-semibold text-neutral-400 mb-1">Ban Type</h3>
              <p className="text-lg font-bold text-red-400">{isPermanent ? "Permanent Ban" : "Temporary Ban"}</p>
            </div>

            {userData.ban_reason && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-400 mb-1">Reason</h3>
                <p className="text-neutral-200">{userData.ban_reason}</p>
              </div>
            )}

            {!isPermanent && bannedUntil && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-400 mb-1">Ban Expires</h3>
                <p className="text-neutral-200">{bannedUntil.toLocaleString()}</p>
                <p className="text-sm text-neutral-400 mt-1">
                  You will be able to access your account after this time.
                </p>
              </div>
            )}

            {isPermanent && (
              <div>
                <p className="text-sm text-neutral-400">
                  This is a permanent ban. If you believe this was a mistake, please contact support.
                </p>
              </div>
            )}
          </div>

          <div className="text-sm text-neutral-500">
            <p>If you have questions about this ban, please contact the game administrators.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
