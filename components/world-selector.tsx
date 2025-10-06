"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { GameWorld } from "@/lib/types/game"

interface WorldSelectorProps {
  gameWorlds: GameWorld[]
  userGameStates: any[]
  userId: string
}

export default function WorldSelector({ gameWorlds, userGameStates, userId }: WorldSelectorProps) {
  const router = useRouter()
  const [selectedWorld, setSelectedWorld] = useState<number | null>(null)

  const getUserStateForWorld = (worldId: number) => {
    return userGameStates.find((state) => state.world_id === worldId)
  }

  const handleWorldSelect = (worldId: number) => {
    setSelectedWorld(worldId)
    // Navigate to game with selected world
    router.push(`/game?world=${worldId}`)
  }

  const formatLastPlayed = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {gameWorlds.map((world) => {
        const userState = getUserStateForWorld(world.id)
        const hasProgress = !!userState

        return (
          <Card
            key={world.id}
            className={`bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition-all duration-300 cursor-pointer ${
              selectedWorld === world.id ? "ring-2 ring-amber-500" : ""
            }`}
            onClick={() => handleWorldSelect(world.id)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-white text-lg">{world.name}</CardTitle>
                {hasProgress && (
                  <Badge variant="secondary" className="bg-amber-600/20 text-amber-400 border-amber-600/30">
                    Active
                  </Badge>
                )}
              </div>
              <CardDescription className="text-slate-300">{world.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {hasProgress ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Last played:</span>
                      <span className="text-slate-300">{formatLastPlayed(userState.last_played)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Tanks deployed:</span>
                      <span className="text-slate-300">{userState.game_data?.tanks?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Base level:</span>
                      <span className="text-slate-300">{userState.game_data?.base?.level || 1}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-slate-400 text-sm mb-2">New battlefield</p>
                    <p className="text-xs text-slate-500">Start your campaign here</p>
                  </div>
                )}

                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleWorldSelect(world.id)
                  }}
                >
                  {hasProgress ? "CONTINUE CAMPAIGN" : "START CAMPAIGN"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
