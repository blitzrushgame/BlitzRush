"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SignUpPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/`,
          data: {
            username: username,
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error("Failed to create account")
      }

      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_user_id: authData.user.id,
          username: username,
          email: email,
        }),
      })

      if (!registerRes.ok) {
        const { error: registerError } = await registerRes.json()
        throw new Error(registerError || "Failed to register username")
      }

      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
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
        <Card className="bg-neutral-800/40 backdrop-blur-md border-neutral-600/30 w-96">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Join the Ranks</CardTitle>
            <CardDescription className="text-neutral-400">Create your commander account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="username" className="text-neutral-300">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="commander"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-neutral-700/50 border-neutral-600/50 text-white placeholder-neutral-500"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-neutral-300">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="commander@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-neutral-700/50 border-neutral-600/50 text-white placeholder-neutral-500"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-neutral-300">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-neutral-700/50 border-neutral-600/50 text-white placeholder-neutral-500"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="repeat-password" className="text-neutral-300">
                    Repeat Password
                  </Label>
                  <Input
                    id="repeat-password"
                    type="password"
                    required
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    className="bg-neutral-700/50 border-neutral-600/50 text-white placeholder-neutral-500"
                  />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={isLoading}>
                  {isLoading ? "ENLISTING..." : "ENLIST"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                <span className="text-neutral-400">Already enlisted? </span>
                <Link href="/auth/login" className="text-amber-400 hover:text-amber-300 transition-colors">
                  Login here
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
