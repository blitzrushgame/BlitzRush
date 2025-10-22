"use server"

import { cookies } from "next/headers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

async function checkVPN(ipAddress: string): Promise<{ isVPN: boolean; error?: string }> {
  const apiKey = process.env.IPHUB_API_KEY

  if (!apiKey) {
    console.warn("[v0] IPHub API key not configured, skipping VPN check")
    return { isVPN: false }
  }

  try {
    const response = await fetch(`https://v2.api.iphub.info/ip/${ipAddress}`, {
      headers: {
        "X-Key": apiKey,
      },
    })

    if (!response.ok) {
      console.error("[v0] IPHub API error:", response.status)
      return { isVPN: false }
    }

    const data = await response.json()

    if (data.block === 1) {
      return { isVPN: true }
    }

    return { isVPN: false }
  } catch (error) {
    console.error("[v0] IPHub check failed:", error)
    return { isVPN: false }
  }
}

async function checkIPBan(ipAddress: string): Promise<{ isBanned: boolean; reason?: string; bannedUntil?: Date }> {
  const supabase = createServiceRoleClient()

  const { data: bannedIP } = await supabase
    .from("banned_ips")
    .select("ban_type, reason, banned_until")
    .eq("ip_address", ipAddress)
    .maybeSingle()

  if (!bannedIP) {
    return { isBanned: false }
  }

  // Check if temporary ban has expired
  if (bannedIP.ban_type === "temporary" && bannedIP.banned_until) {
    const expirationDate = new Date(bannedIP.banned_until)
    if (expirationDate < new Date()) {
      // Ban has expired, remove it
      await supabase.from("banned_ips").delete().eq("ip_address", ipAddress)
      return { isBanned: false }
    }
  }

  return {
    isBanned: true,
    reason: bannedIP.reason,
    bannedUntil: bannedIP.banned_until ? new Date(bannedIP.banned_until) : undefined,
  }
}

async function checkUserBan(userId: number): Promise<{ isBanned: boolean; reason?: string; bannedUntil?: Date }> {
  const supabase = createServiceRoleClient()

  const { data: user } = await supabase
    .from("users")
    .select("is_banned, ban_type, ban_reason, banned_until")
    .eq("id", userId)
    .maybeSingle()

  if (!user || !user.is_banned) {
    return { isBanned: false }
  }

  // Check if temporary ban has expired
  if (user.ban_type === "temporary" && user.banned_until) {
    const expirationDate = new Date(user.banned_until)
    if (expirationDate < new Date()) {
      // Ban has expired, remove it
      await supabase
        .from("users")
        .update({
          is_banned: false,
          ban_type: null,
          ban_reason: null,
          banned_until: null,
          banned_at: null,
          banned_by_admin_id: null,
        })
        .eq("id", userId)
      return { isBanned: false }
    }
  }

  return {
    isBanned: true,
    reason: user.ban_reason || undefined,
    bannedUntil: user.banned_until ? new Date(user.banned_until) : undefined,
  }
}

export async function signup(username: string, password: string, ipAddress: string) {
  console.log("[v0] Starting signup process for username:", username)

  const ipBanCheck = await checkIPBan(ipAddress)
  if (ipBanCheck.isBanned) {
    console.log("[v0] IP is banned:", ipAddress)
    return { success: false, error: "This IP address has been banned from creating accounts." }
  }

  const supabase = createServiceRoleClient()

  const vpnCheck = await checkVPN(ipAddress)
  if (vpnCheck.isVPN) {
    console.log("[v0] VPN detected for IP:", ipAddress)
    return { success: false, error: "VPN or proxy detected. Please disable your VPN and try again." }
  }

  const { data: existingUser } = await supabase.from("users").select("id").ilike("username", username).maybeSingle()

  if (existingUser) {
    console.log("[v0] Username already exists:", username)
    return { success: false, error: "Username already taken" }
  }

  console.log("[v0] Attempting to insert new user into database")
  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      username,
      password,
      ip_address: ipAddress,
      auth_user_id: null,
      email: null,
      role: "player",
      points: 0,
      is_banned: false,
      is_muted: false,
      block_alliance_invites: false,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Database error during signup:", error)
    return { success: false, error: `Database error: ${error.message}` }
  }

  console.log("[v0] User created successfully with ID:", newUser.id)

  const cookieStore = await cookies()
  cookieStore.set("user_id", newUser.id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  })

  return { success: true, userId: newUser.id }
}

export async function login(username: string, password: string) {
  const supabase = createServiceRoleClient()

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .ilike("username", username)
    .eq("password", password)
    .maybeSingle()

  if (error || !user) {
    return { success: false, error: "Invalid username or password" }
  }

  const userBanCheck = await checkUserBan(user.id)
  if (userBanCheck.isBanned) {
    return { success: false, error: "banned", userId: user.id }
  }

  const ipBanCheck = await checkIPBan(user.ip_address)
  if (ipBanCheck.isBanned) {
    return { success: false, error: "This IP address has been banned." }
  }

  const cookieStore = await cookies()
  cookieStore.set("user_id", user.id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  })

  return { success: true, userId: user.id }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete("user_id")
  return { success: true }
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value

  if (!userId) {
    return null
  }

  const supabase = createServiceRoleClient()
  const { data: user } = await supabase.from("users").select("*").eq("id", Number.parseInt(userId)).single()

  return user
}
