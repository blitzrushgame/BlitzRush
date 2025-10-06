"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (error) throw error

      setProfile(data)
      setDisplayName(data.display_name || "")
      setBio(data.bio || "")
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoading(false)
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleSave() {
    if (!profile) return

    setSaving(true)
    try {
      let avatarUrl = profile.avatar_url

      // Upload avatar if changed
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop()
        const fileName = `${profile.id}-${Date.now()}.${fileExt}`
        const filePath = `avatars/${fileName}`

        const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, avatarFile)

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath)

        avatarUrl = publicUrl
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          bio: bio,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) throw error

      await loadProfile()
      setIsEditing(false)
      setAvatarFile(null)
      setAvatarPreview(null)
    } catch (error) {
      console.error("Error saving profile:", error)
      alert("Failed to save profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-amber-500 text-xl">Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-red-500 text-xl">Profile not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-amber-500">COMMANDER PROFILE</h1>
          <Button
            onClick={() => router.push("/worlds")}
            variant="outline"
            className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-slate-900"
          >
            Back to Worlds
          </Button>
        </div>

        <Card className="bg-slate-800/50 border-amber-500/30">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <Avatar className="w-24 h-24 border-2 border-amber-500">
                  <AvatarImage src={avatarPreview || profile.avatar_url || ""} />
                  <AvatarFallback className="bg-slate-700 text-amber-500 text-2xl">
                    {profile.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl text-amber-500">{profile.display_name || profile.username}</CardTitle>
                  <CardDescription className="text-slate-400">@{profile.username}</CardDescription>
                </div>
              </div>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} className="bg-amber-500 text-slate-900 hover:bg-amber-600">
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="avatar" className="text-amber-500">
                    Profile Picture
                  </Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="bg-slate-700 border-slate-600 text-slate-200"
                  />
                </div>

                <div>
                  <Label htmlFor="displayName" className="text-amber-500">
                    Display Name
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter display name"
                    className="bg-slate-700 border-slate-600 text-slate-200"
                  />
                </div>

                <div>
                  <Label htmlFor="bio" className="text-amber-500">
                    Biography
                  </Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    className="bg-slate-700 border-slate-600 text-slate-200"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-amber-500 text-slate-900 hover:bg-amber-600"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false)
                      setDisplayName(profile.display_name || "")
                      setBio(profile.bio || "")
                      setAvatarFile(null)
                      setAvatarPreview(null)
                    }}
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-amber-500 font-semibold mb-2">Biography</h3>
                  <p className="text-slate-300">{profile.bio || "No biography set yet."}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                  <div>
                    <h3 className="text-amber-500 font-semibold mb-1">Account Created</h3>
                    <p className="text-slate-300">{formatDate(profile.created_at)}</p>
                  </div>
                  <div>
                    <h3 className="text-amber-500 font-semibold mb-1">Rank</h3>
                    <p className="text-slate-400 italic">Coming Soon</p>
                  </div>
                  <div>
                    <h3 className="text-amber-500 font-semibold mb-1">Alliance</h3>
                    <p className="text-slate-400 italic">Coming Soon</p>
                  </div>
                  <div>
                    <h3 className="text-amber-500 font-semibold mb-1">Leaderboard Position</h3>
                    <p className="text-slate-400 italic">Coming Soon</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
