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
      return { isVPN: false } // Fail open - don't block if API is down
    }

    const data = await response.json()

    // block: 0 = residential/safe, 1 = VPN/proxy/hosting, 2 = search engine
    if (data.block === 1) {
      return { isVPN: true }
    }

    return { isVPN: false }
  } catch (error) {
    console.error("[v0] IPHub check failed:", error)
    return { isVPN: false } // Fail open
  }
}

export async function signup(username: string, password: string, ipAddress: string) {
  const supabase = createServiceRoleClient()

  const vpnCheck = await checkVPN(ipAddress)
  if (vpnCheck.isVPN) {
    return { success: false, error: "VPN or proxy detected. Please disable your VPN and try again." }
  }

  // Check if username already exists (case-insensitive)
  const { data: existingUser } = await supabase.from("users").select("id").ilike("username", username).maybeSingle()

  if (existingUser) {
    return { success: false, error: "Username already taken" }
  }

  const { data: existingAccounts, error: countError } = await supabase
    .from("users")
    .select("id", { count: "exact" })
    .eq("ip_address", ipAddress)

  if (countError) {
    return { success: false, error: countError.message }
  }

  if (existingAccounts && existingAccounts.length >= 2) {
    return { success: false, error: "Maximum of 2 accounts allowed per IP address" }
  }

  // Create user
  const { data: newUser, error } = await supabase
    .from("users")
    .insert({ username, password, ip_address: ipAddress })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Create session
  const cookieStore = await cookies()
  cookieStore.set("user_id", newUser.id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  return { success: true, userId: newUser.id }
}

export async function login(username: string, password: string) {
  const supabase = createServiceRoleClient()

  // Find user (case-insensitive username)
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .ilike("username", username)
    .eq("password", password)
    .maybeSingle()

  if (error || !user) {
    return { success: false, error: "Invalid username or password" }
  }

  // Create session
  const cookieStore = await cookies()
  cookieStore.set("user_id", user.id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
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
