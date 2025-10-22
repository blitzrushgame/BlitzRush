"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signup } from "@/lib/auth/simple-auth"
import Link from "next/link"

export default function SignUpPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const getUserIP = async () => {
    try {
      const response = await fetch("https://api.ipify.org?format=json")
      const data = await response.json()
      return data.ip
    } catch {
      return "unknown"
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!username || username.trim().length < 3) {
      setError("Username must be at least 3 characters")
      setIsLoading(false)
      return
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    const ipAddress = await getUserIP()
    console.log("[v0] Attempting signup with IP:", ipAddress)

    const result = await signup(username, password, ipAddress)

    if (!result.success) {
      if (result.error?.includes("banned")) {
        router.push("/banned")
      } else {
        console.error("[v0] Signup failed:", result.error)
        setError(result.error || "Signup failed")
        setIsLoading(false)
      }
    } else {
      console.log("[v0] Signup successful, redirecting to game")
      router.push("/game")
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background image with fade and vignette */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage: "url('/images/tank-background.png')",
        }}
      />
      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/20 to-black/60" />

      {/* Main content */}
      <div className="relative z-10">
        <div className="bg-neutral-800/40 backdrop-blur-md border border-neutral-600/30 rounded-lg p-8 w-96 mx-auto">
          <h2 className="text-2xl font-bold text-white mb-2">Join the Ranks</h2>
          <p className="text-neutral-400 text-sm mb-6">Create your commander account</p>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-neutral-300 text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-neutral-700/50 border border-neutral-600/50 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                placeholder="commander"
                required
              />
            </div>

            <div>
              <label className="block text-neutral-300 text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-700/50 border border-neutral-600/50 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "ENLISTING..." : "ENLIST"}
            </button>

            <div className="text-center text-sm">
              <Link href="/" className="text-amber-400 hover:text-amber-300 transition-colors">
                Already enlisted?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
