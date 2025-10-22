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

  console.log("[v0] Creating Supabase Auth user with metadata...")
  // Create Supabase Auth user with metadata
  // The database trigger will automatically create the user profile
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/game`,
      data: {
        username,
        ip_address: ip,
      },
    },
  })

  if (authError || !authData.user) {
    console.error("[v0] Auth error:", authError)
    return { success: false, error: authError?.message || "Failed to create account" }
  }

  console.log("[v0] Auth user created with ID:", authData.user.id)
  console.log("[v0] Database trigger will automatically create user profile")

  return { success: true }
}

// Client-side login with username
export async function loginClient(username: string, password: string, ip: string) {
  const supabase = createBrowserClient()

  console.log("[v0] Looking up user by username:", username)

  // Look up email from username
  const { data: userData, error: lookupError } = await supabase
    .from("users")
    .select("email, id, is_banned")
    .eq("username", username)
    .single()

  console.log("[v0] User lookup result:", { userData, lookupError })

  if (lookupError || !userData) {
    console.log("[v0] User not found or lookup error")
    return { success: false, error: "Invalid username or password" }
  }

  console.log("[v0] Found user with email:", userData.email)

  if (userData.is_banned) {
    console.log("[v0] User is banned")
    return { success: false, error: "Account is banned" }
  }

  console.log("[v0] Attempting Supabase Auth sign in with email:", userData.email)

  // Sign in with email and password using Supabase Auth
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password,
  })

  console.log("[v0] Sign in result:", { signInData, signInError })

  if (signInError) {
    console.log("[v0] Sign in failed:", signInError.message)
    return { success: false, error: "Invalid username or password" }
  }

  console.log("[v0] Sign in successful, tracking IP")

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

  console.log("[v0] Login complete")
  return { success: true }
}
