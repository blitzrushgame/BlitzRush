import { createBrowserClient } from "@/lib/supabase/client"

// Client-side signup function
export async function signupClient(username: string, email: string, password: string, ip: string) {
  const supabase = createBrowserClient()

  console.log("[v0] Starting signup process for username:", username)

  // Check if username already exists
  const { data: existingUser } = await supabase.from("users").select("id").eq("username", username).single()

  if (existingUser) {
    console.log("[v0] Username already exists")
    return { success: false, error: "Username already taken" }
  }

  console.log("[v0] Creating Supabase Auth user...")
  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/game`,
    },
  })

  if (authError || !authData.user) {
    console.error("[v0] Auth error:", authError)
    return { success: false, error: authError?.message || "Failed to create account" }
  }

  console.log("[v0] Auth user created with ID:", authData.user.id)

  // Create user record in public.users table
  console.log("[v0] Creating user profile in public.users table...")
  const { error: userError } = await supabase.from("users").insert({
    auth_user_id: authData.user.id,
    username,
    email,
    ip_address: ip,
    role: "player",
    points: 0,
    is_banned: false,
    is_muted: false,
    block_alliance_invites: false,
  })

  if (userError) {
    console.error("[v0] User profile creation error:", userError)
    console.error("[v0] Error details:", JSON.stringify(userError, null, 2))
    return { success: false, error: `Failed to create user profile: ${userError.message}` }
  }

  console.log("[v0] User profile created successfully")

  // Track registration IP
  const { data: userData } = await supabase.from("users").select("id").eq("auth_user_id", authData.user.id).single()

  if (userData) {
    console.log("[v0] Tracking registration IP...")
    await supabase.from("user_ip_history").insert({
      user_id: userData.id,
      ip_address: ip,
      access_count: 1,
    })
  }

  console.log("[v0] Signup completed successfully")
  return { success: true }
}

// Client-side login with username
export async function loginClient(username: string, password: string, ip: string) {
  const supabase = createBrowserClient()

  // Look up email from username
  const { data: userData, error: lookupError } = await supabase
    .from("users")
    .select("email, id, is_banned")
    .eq("username", username)
    .single()

  if (lookupError || !userData) {
    return { success: false, error: "Invalid username or password" }
  }

  if (userData.is_banned) {
    return { success: false, error: "Account is banned" }
  }

  // Sign in with email and password using Supabase Auth
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password,
  })

  if (signInError) {
    return { success: false, error: "Invalid username or password" }
  }

  // Track login IP
  const { data: ipHistory } = await supabase
    .from("user_ip_history")
    .select("id, access_count")
    .eq("user_id", userData.id)
    .eq("ip_address", ip)
    .single()

  if (ipHistory) {
    // Update existing IP record
    await supabase
      .from("user_ip_history")
      .update({
        last_seen: new Date().toISOString(),
        access_count: ipHistory.access_count + 1,
      })
      .eq("id", ipHistory.id)
  } else {
    // Create new IP record
    await supabase.from("user_ip_history").insert({
      user_id: userData.id,
      ip_address: ip,
      access_count: 1,
    })
  }

  return { success: true }
}
