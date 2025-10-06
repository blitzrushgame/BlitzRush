"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import GameCanvas from "@/components/game-canvas-persistent"
import { GameChat, type GameChatRef } from "@/components/game-chat"
import type { GameStateData } from "@/lib/types/game"

export default function GamePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingText, setLoadingText] = useState("Initializing battlefield...")
  const [gameState, setGameState] = useState<GameStateData | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [username, setUsername] = useState<string>("")
  const [allianceId, setAllianceId] = useState<number | undefined>(undefined)
  const [currentMap, setCurrentMap] = useState<number>(1)
  const chatRef = useRef<GameChatRef>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch("/api/auth/check")
      const data = await response.json()

      if (!data.authenticated) {
        router.push("/")
        return
      }

      setUserId(Number(data.userId))
      const userResponse = await fetch(`/api/user/${data.userId}`)
      const userData = await userResponse.json()
      setUsername(userData.username || "Player")
      setAllianceId(userData.alliance_id)

      await loadGameState(Number(data.userId), currentMap)
    }

    checkAuth()
  }, [currentMap])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only focus chat if Enter is pressed and no input/textarea is currently focused
      if (e.key === "Enter") {
        const activeElement = document.activeElement
        const isInputFocused = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement

        if (!isInputFocused) {
          e.preventDefault()
          chatRef.current?.focusGlobalChat()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const loadGameState = async (userId: number, mapId: number) => {
    try {
      setLoadingProgress(20)
      setLoadingText("Loading world data...")

      const response = await fetch(`/api/game/state?userId=${userId}&mapId=${mapId}`)

      if (!response.ok) {
        console.error("[v0] API returned error:", response.status)
        let errorText = "Unknown error"
        try {
          const errorData = await response.json()
          errorText = errorData.error || errorData.details || errorText
        } catch (e) {
          errorText = await response.text()
        }
        console.error("[v0] Error details:", errorText)

        // Create default state on error
        const newState: GameStateData = {
          camera: { x: 0, y: 0, zoom: 2 },
          buildings: [],
          units: [],
          resources: {
            concrete: 1000,
            steel: 500,
            carbon: 300,
            fuel: 200,
          },
          selectedUnits: [],
          selectionBox: { start: null, end: null },
          isDragging: false,
          isSelecting: false,
          dragStart: null,
        }
        setGameState(newState)
        setLoadingProgress(100)
        setLoadingText("Battle ready!")
        setTimeout(() => setLoading(false), 500)
        return
      }

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error("[v0] Failed to parse response as JSON:", parseError)
        const text = await response.text()
        console.error("[v0] Response text:", text)
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`)
      }

      setLoadingProgress(60)
      setLoadingText("Deploying units...")

      if (data.state) {
        setGameState(data.state as GameStateData)
      } else {
        const newState: GameStateData = {
          camera: { x: 0, y: 0, zoom: 2 },
          buildings: [],
          units: [],
          resources: {
            concrete: 1000,
            steel: 500,
            carbon: 300,
            fuel: 200,
          },
          selectedUnits: [],
          selectionBox: { start: null, end: null },
          isDragging: false,
          isSelecting: false,
          dragStart: null,
        }
        setGameState(newState)
      }

      setLoadingProgress(100)
      setLoadingText("Battle ready!")

      setTimeout(() => {
        setLoading(false)
      }, 500)
    } catch (error) {
      console.error("[v0] Error in loadGameState:", error)
      const newState: GameStateData = {
        camera: { x: 0, y: 0, zoom: 2 },
        buildings: [],
        units: [],
        resources: {
          concrete: 1000,
          steel: 500,
          carbon: 300,
          fuel: 200,
        },
        selectedUnits: [],
        selectionBox: { start: null, end: null },
        isDragging: false,
        isSelecting: false,
        dragStart: null,
      }
      setGameState(newState)
      setLoading(false)
    }
  }

  const saveGameState = async (newState: GameStateData) => {
    if (!userId) return

    try {
      await fetch("/api/game/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          mapId: currentMap,
          state: newState,
        }),
      })
    } catch (error) {
      console.error("Error in saveGameState:", error)
    }
  }

  const handleMapChange = (mapId: number) => {
    setCurrentMap(mapId)
    setLoading(true)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="w-full max-w-2xl px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-amber-400 mb-2">BLITZ RUSH</h1>
            <p className="text-green-400 text-lg">{loadingText}</p>
          </div>

          <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden border border-amber-600/50">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>

          <div className="mt-4 text-center text-amber-400 font-mono">{loadingProgress}%</div>
        </div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-red-400">Failed to load game state</div>
      </div>
    )
  }

  return (
    <>
      <GameCanvas
        initialState={gameState}
        onStateChange={saveGameState}
        worldId={currentMap.toString()}
        onMapChange={handleMapChange}
        currentMap={currentMap}
      />
      {userId && <GameChat ref={chatRef} userId={userId} username={username} allianceId={allianceId} />}
    </>
  )
}
