"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signupClient, loginClient } from "@/lib/auth/supabase-auth"

export default function HomePage() {
  const router = useRouter()
  const [showLogin, setShowLogin] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handlePlayClick = () => {
    setShowLogin(true)
    setIsSignUp(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      console.log("[v0] Getting IP address")
      const ipRes = await fetch("/api/get-ip")
      const { ip } = await ipRes.json()

      console.log("[v0] Attempting login with username:", username)
      const result = await loginClient(username, password, ip)

      if (!result.success) {
        setError(result.error || "Login failed")
        setLoading(false)
        return
      }

      console.log("[v0] Login successful, redirecting to game")
      router.push("/game")
    } catch (err: any) {
      console.error("[v0] Login error:", err)
      setError(err.message || "An error occurred during login")
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      console.log("[v0] Getting IP address")
      const ipRes = await fetch("/api/get-ip")
      const { ip } = await ipRes.json()

      console.log("[v0] Attempting signup with username:", username)
      const result = await signupClient(username, email, password, ip)

      if (!result.success) {
        setError(result.error || "Registration failed")
        setLoading(false)
        return
      }

      console.log("[v0] Signup successful, redirecting to game")
      router.push("/game")
    } catch (err: any) {
      console.error("[v0] Signup error:", err)
      setError(err.message || "An error occurred during registration")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage: "url('/images/tank-background.png')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/20 to-black/60" />

      <div className="relative z-10 text-center">
        <h1
          className={`text-6xl font-bold text-white tracking-wider mb-8 transition-all duration-700 font-mono ${
            showLogin ? "-translate-y-32 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          BLITZ RUSH
        </h1>

        <div
          className={`space-y-4 transition-all duration-500 ${
            showLogin ? "opacity-0 translate-y-8 pointer-events-none" : "opacity-100 translate-y-0"
          }`}
        >
          <button
            onClick={handlePlayClick}
            className="bg-amber-100/80 hover:bg-amber-200/90 text-amber-900 font-semibold py-4 px-12 text-xl border border-amber-300/60 hover:border-amber-400/80 backdrop-blur-sm transition-all duration-300 font-mono"
          >
            PLAY
          </button>
        </div>

        <div
          className={`transition-all duration-700 ${
            showLogin ? "opacity-100 -translate-y-8" : "opacity-0 translate-y-32 pointer-events-none"
          }`}
        >
          <div className="bg-neutral-800/40 backdrop-blur-md border border-neutral-600/30 rounded-lg p-8 w-96 mx-auto opacity-85">
            <h2 className="text-2xl font-bold text-white mb-2">{isSignUp ? "Join the Ranks" : "Welcome Back"}</h2>
            <p className="text-neutral-400 text-sm mb-6 font-mono shadow-none">
              {isSignUp ? "Create your commander account" : "Sign in to continue your campaign"}
            </p>

            <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
              <div>
                <label className="block text-neutral-300 text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-neutral-700/50 border border-neutral-600/50 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  placeholder="commander"
                  required
                  minLength={3}
                />
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-neutral-300 text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-700/50 border border-neutral-600/50 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                    placeholder="commander@blitzrush.com"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-neutral-300 text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-700/50 border border-neutral-600/50 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "DEPLOYING..." : isSignUp ? "ENLIST" : "DEPLOY"}
              </button>

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setError("")
                  }}
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  {isSignUp ? "Already enlisted? Login here" : "New recruit? Register here"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
