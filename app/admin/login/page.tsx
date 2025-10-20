"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Shield } from "lucide-react"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      console.log("[v0] Login response:", { ok: response.ok, data })

      if (response.ok) {
        console.log("[v0] Login successful, redirecting to /admin")
        window.location.href = "/admin"
      } else {
        setError(data.error || "Invalid credentials or unauthorized IP")
      }
    } catch (err) {
      console.error("[v0] Login error:", err)
      setError("Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <div className="w-full max-w-md p-8 bg-neutral-800/40 backdrop-blur-md border border-neutral-600/30 rounded-lg">
        <div className="flex items-center justify-center mb-6">
          <Shield className="w-12 h-12 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-amber-400 mb-2 text-center">Admin Portal</h1>
        <p className="text-neutral-400 text-sm text-center mb-6">Secure access required</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-neutral-900/50 border-neutral-600/30 text-neutral-100"
              required
            />
          </div>

          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-neutral-900/50 border-neutral-600/30 text-neutral-100"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">{error}</div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold"
          >
            {isLoading ? "Authenticating..." : "Login"}
          </Button>
        </form>

        <p className="text-neutral-500 text-xs text-center mt-6">All login attempts are logged and monitored</p>
      </div>
    </div>
  )
}
