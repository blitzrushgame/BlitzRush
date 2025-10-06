import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/simple-auth"
import { getGameWorlds, getUserGameStates } from "@/lib/game/game-state"
import WorldSelector from "@/components/world-selector"

export default async function WorldsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/")
  }

  const [gameWorlds, userGameStates] = await Promise.all([getGameWorlds(), getUserGameStates(user.id)])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">CHOOSE YOUR BATTLEFIELD</h1>
          <p className="text-slate-300">Select a world to begin your campaign</p>
        </div>

        <WorldSelector gameWorlds={gameWorlds} userGameStates={userGameStates} userId={user.id} />
      </div>
    </div>
  )
}
