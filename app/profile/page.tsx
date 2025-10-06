"use client"

import type React from "react"
import Link from "next/link"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Users, Target, Upload } from "lucide-react"

interface UserProfile {
  id: number
  username: string
  bio: string
  profile_picture: string
  points: number
  leaderboard_rank: number | null
  alliance_id: number | null
  alliance_name: string | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [bio, setBio] = useState("")
  const [profilePicture, setProfilePicture] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const authRes = await fetch("/api/auth/check")
      const authData = await authRes.json()

      if (!authData.authenticated) {
        router.push("/")
        return
      }

      const profileRes = await fetch(`/api/profile/${authData.userId}`)
      const profileData = await profileRes.json()

      setProfile(profileData)
      setBio(profileData.bio || "")
      setProfilePicture(profileData.profile_picture || "")
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!profile) return

    setSaving(true)
    try {
      const res = await fetch(`/api/profile/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          profile_picture: profilePicture,
        }),
      })

      if (!res.ok) throw new Error("Failed to save profile")

      await loadProfile()
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving profile:", error)
      alert("Failed to save profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB")
      return
    }

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("userId", profile.id.toString())
      formData.append("oldPictureUrl", profile.profile_picture || "")

      const res = await fetch("/api/profile/upload-picture", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Upload failed")
      }

      const data = await res.json()
      setProfilePicture(data.url)

      await loadProfile()
      alert("Profile picture updated successfully!")
    } catch (error) {
      console.error("Error uploading image:", error)
      alert(error instanceof Error ? error.message : "Failed to upload image")
      setPreviewUrl(null)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-amber-400 text-xl">Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 text-xl">Profile not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-end items-center mb-8">
          <Button
            onClick={() => router.push("/game")}
            className="bg-amber-500/10 border border-amber-500/50 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 font-bold"
          >
            Return
          </Button>
        </div>

        <Card className="bg-neutral-800/95 border-amber-500/30 backdrop-blur-md">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="w-32 h-32 border-4 border-amber-500">
                    <AvatarImage src={previewUrl || profile.profile_picture} />
                    <AvatarFallback className="bg-neutral-700 text-amber-400 text-3xl">
                      {profile.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div>
                      <input
                        type="file"
                        id="imageUpload"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        onClick={() => document.getElementById("imageUpload")?.click()}
                        disabled={uploading}
                        size="sm"
                        className="bg-amber-500 text-gray-900 hover:bg-amber-600 font-bold"
                      >
                        {uploading ? (
                          "UPLOADING..."
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-1" />
                            EDIT IMAGE
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <CardTitle className="text-3xl text-amber-400 mb-2">{profile.username}</CardTitle>
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm">
                      Rank #{profile.leaderboard_rank || "Unranked"} • {profile.points.toLocaleString()} Points
                    </span>
                  </div>
                </div>
              </div>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} className="bg-amber-500 text-gray-900 hover:bg-amber-600">
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bio" className="text-amber-400">
                    Biography
                  </Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others about yourself..."
                    rows={4}
                    maxLength={500}
                    className="bg-neutral-700 border-neutral-600 text-neutral-200"
                  />
                  <p className="text-xs text-neutral-500 mt-1">{bio.length}/500 characters</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-amber-500 text-gray-900 hover:bg-amber-600"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false)
                      setBio(profile.bio || "")
                      setProfilePicture(profile.profile_picture || "")
                      setPreviewUrl(null)
                    }}
                    variant="outline"
                    className="border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Biography
                  </h3>
                  <p className="text-neutral-300">{profile.bio || "No biography set yet."}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-neutral-700">
                  <div className="bg-neutral-900/50 p-4 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-5 h-5 text-amber-400" />
                      <h3 className="text-amber-400 font-semibold">Points</h3>
                    </div>
                    <p className="text-2xl font-bold text-neutral-200">{profile.points.toLocaleString()}</p>
                  </div>

                  <div className="bg-neutral-900/50 p-4 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-amber-400" />
                      <h3 className="text-amber-400 font-semibold">Leaderboard</h3>
                    </div>
                    <p className="text-2xl font-bold text-neutral-200">#{profile.leaderboard_rank || "Unranked"}</p>
                  </div>

                  <div className="bg-neutral-900/50 p-4 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-amber-400" />
                      <h3 className="text-amber-400 font-semibold">Alliance</h3>
                    </div>
                    {profile.alliance_name && profile.alliance_id ? (
                      <Link
                        href={`/alliance?view=${profile.alliance_id}`}
                        className="text-lg font-semibold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer inline-block"
                      >
                        {profile.alliance_name}
                      </Link>
                    ) : (
                      <p className="text-lg font-semibold text-neutral-200">No Alliance</p>
                    )}
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
