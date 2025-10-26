"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import GameCanvas, { type GameCanvasRef } from "@/components/game-canvas-persistent"
import { GameChat, type GameChatRef } from "@/components/game-chat"
import type { GameStateData } from "@/lib/types/game"
import { useGameRealtime } from "@/hooks/use-game-realtime"
import { WORLD_SIZE_TILES } from "@/lib/game/constants"

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
  const canvasRef = useRef<GameCanvasRef | null>(null)

  useGameRealtime({
    worldId: currentMap,
    userId: userId || 0,
    onUnitsUpdate: (payload) => {
      console.log("[v0] Real-time units update received:", payload)
    },
    onBuildingsUpdate: (payload) => {
      console.log("[v0] Real-time buildings update received:", payload)
    },
    onResourcesUpdate: (payload) => {
      console.log("[v0] Real-time resources update received:", payload)
      if (payload.new && payload.new.game_data && payload.new.game_data.resources) {
        setGameState((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            resources: payload.new.game_data.resources,
          }
        })
      }
    },
    onCombatLog: (payload) => {
      console.log("[v0] Real-time combat log received:", payload)
    },
    onGameStateUpdate: (payload) => {
      console.log("[v0] Real-time game state update from other player:", payload)
    },
  })

  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch("/api/auth/check")
      const data = await response.json()

      if (!data.authenticated) {
        if (data.error) {
          alert(data.error)
        }
        router.push("/")
        return
      }

      setUserId(Number(data.userId))
      setUsername(data.username || "Player")

      try {
        await fetch("/api/game/log-ip", {
          method: "POST",
        })
      } catch (error) {
        console.error("[v0] Error logging IP:", error)
      }

      const userResponse = await fetch(`/api/user/${data.userId}`)
      const userData = await userResponse.json()

      if (userData.is_banned) {
        router.push("/banned")
        return
      }

      setAllianceId(userData.alliance_id)

      await loadGameState(Number(data.userId), currentMap)
    }

    checkAuth()
  }, [currentMap])

  useEffect(() => {
    if (!userId) return

    const refreshAllianceStatus = async () => {
      try {
        const userResponse = await fetch(`/api/user/${userId}`)

        if (!userResponse.ok) {
          return
        }

        const userData = await userResponse.json()

        if (userData.is_banned) {
          router.push("/banned")
          return
        }

        if (userData && !userData.error && userData.alliance_id !== allianceId) {
          setAllianceId(userData.alliance_id)
        }
      } catch (error) {
        console.error("[v0] Error refreshing alliance status:", error)
      }
    }

    const interval = setInterval(refreshAllianceStatus, 30000)
    return () => clearInterval(interval)
  }, [userId, allianceId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      setLoading(true)
      setLoadingProgress(1)
      setLoadingText("loading world")

      const phase1Start = Date.now()
      const phase1Duration = 40
      const phase1Interval = setInterval(() => {
        const elapsed = Date.now() - phase1Start
        const progress = Math.min(elapsed / phase1Duration, 1)
        setLoadingProgress(1 + progress * 10)
        if (progress >= 1) clearInterval(phase1Interval)
      }, 5)

      await new Promise((resolve) => setTimeout(resolve, 40))
      setLoadingProgress(11)

      setLoadingText("loading players")
      await new Promise((resolve) => setTimeout(resolve, 70))

      setLoadingProgress(42)
      await new Promise((resolve) => setTimeout(resolve, 120))

      setLoadingText("loading battlefield")
      const phase4Start = Date.now()
      const phase4Duration = 170
      const phase4Interval = setInterval(() => {
        const elapsed = Date.now() - phase4Start
        const progress = Math.min(elapsed / phase4Duration, 1)
        setLoadingProgress(42 + progress * 58)
        if (progress >= 1) clearInterval(phase4Interval)
      }, 5)

      const response = await fetch(`/api/game/state?userId=${userId}&mapId=${mapId}`)

      if (!response.ok) {
        const newState: GameStateData = {
          camera: { x: WORLD_SIZE_TILES / 2, y: WORLD_SIZE_TILES / 2, zoom: 1.0 },
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
        await new Promise((resolve) => setTimeout(resolve, 170))
        setLoadingProgress(100)
        setTimeout(() => setLoading(false), 100)
        return
      }

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error("[v0] Failed to parse response as JSON:", parseError)
        throw new Error("Invalid JSON response")
      }

      let newState: GameStateData
      if (data.state) {
        newState = data.state as GameStateData
      } else {
        newState = {
          camera: { x: WORLD_SIZE_TILES / 2, y: WORLD_SIZE_TILES / 2, zoom: 1.0 },
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
      }

      console.log("[v0] Initializing home base for user:", userId)
      const initResponse = await fetch("/api/game/home-base/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, username }),
      })

      if (initResponse.ok) {
        const initData = await initResponse.json()
        if (initData.homeBase) {
          console.log("[v0] Home base ready at:", initData.homeBase.x, initData.homeBase.y)
          newState.camera.x = initData.homeBase.x
          newState.camera.y = initData.homeBase.y
        }
      } else {
        console.error("[v0] Failed to initialize home base")
      }

      const targetCoords = sessionStorage.getItem("targetCoordinates")
      if (targetCoords) {
        const { x, y } = JSON.parse(targetCoords)
        newState.camera.x = x
        newState.camera.y = y
        sessionStorage.removeItem("targetCoordinates")
      }

      setGameState(newState)

      await new Promise((resolve) => setTimeout(resolve, Math.max(0, 170 - (Date.now() - phase4Start))))
      setLoadingProgress(100)

      setTimeout(() => {
        setLoading(false)
      }, 100)
    } catch (error) {
      console.error("[v0] Error in loadGameState:", error)
      const newState: GameStateData = {
        camera: { x: WORLD_SIZE_TILES / 2, y: WORLD_SIZE_TILES / 2, zoom: 1.0 },
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
  }

  const handleSendCoordinateMessage = async (message: string) => {
    if (!userId || !allianceId) {
      return
    }

    try {
      const res = await fetch("/api/chat/alliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          username,
          allianceId,
          message,
        }),
      })

      if (!res.ok) {
        console.error("[v0] Failed to send coordinate message")
      }
    } catch (error) {
      console.error("[v0] Error sending coordinate message:", error)
    }
  }

  const handleCoordinateClick = (mapId: number, x: number, y: number) => {
    if (mapId === currentMap) {
      if (canvasRef.current) {
        canvasRef.current.updateCamera(x, y)
      }
    } else {
      sessionStorage.setItem("targetCoordinates", JSON.stringify({ x, y }))
      setCurrentMap(mapId)
    }
  }

  return (
    <div className="relative w-full h-screen">
      {gameState && (
        <GameCanvas
          ref={canvasRef}
          initialState={gameState}
          onStateChange={saveGameState}
          worldId={currentMap.toString()}
          onMapChange={handleMapChange}
          currentMap={currentMap}
          onSendCoordinateMessage={handleSendCoordinateMessage}
          userId={userId}
        />
      )}

      {userId && (
        <GameChat
          ref={chatRef}
          userId={userId}
          username={username}
          allianceId={allianceId}
          onCoordinateClick={handleCoordinateClick}
        />
      )}

      {loading && (
        <div className="fixed inset-0 bg-neutral-900 flex items-center justify-center z-50 transition-opacity duration-500">
          <div className="w-full max-w-2xl px-8">
            <div className="text-center mb-12">
              <h1 className="text-6xl font-bold text-amber-400 mb-3 tracking-wider drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]">
                BLITZ RUSH
              </h1>
              <div className="h-1 w-48 mx-auto bg-gradient-to-r from-transparent via-amber-500 to-transparent mb-4" />
              <p className="text-amber-400/80 text-xl font-semibold tracking-wide uppercase">{loadingText}</p>
            </div>

            <div className="relative">
              <div className="h-6 bg-neutral-800 rounded-lg overflow-hidden border-2 border-amber-500/30 shadow-lg">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 transition-all duration-100 ease-linear relative"
                  style={{ width: `${loadingProgress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
              </div>

              <div className="mt-4 text-center">
                <span className="text-3xl font-bold text-amber-400 font-mono drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                  {Math.round(loadingProgress)}%
                </span>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
