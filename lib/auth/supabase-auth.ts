import { createClient as createServerClient } from "@/lib/supabase/server"
import { createBrowserClient } from "@/lib/supabase/client"

export async function signUpWithUsername(username: string, email: string, password: string, ipAddress: string) {
  const supabase = createBrowserClient()

  console.log("[v0] Starting Supabase signup with username:", username)

  // Create Supabase Auth user with email/password
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
      data: {
        username, // Store username in auth metadata
      },
    },
  })

  if (authError) {
    console.error("[v0] Supabase auth signup error:", authError)
    throw new Error(authError.message)
  }

  if (!authData.user) {
    throw new Error("Failed to create auth user")
  }

  console.log("[v0] Supabase auth user created:", authData.user.id)

  // Insert into public.users table with auth_user_id
  const { error: dbError } = await supabase.from("users").insert({
    auth_user_id: authData.user.id,
    username,
    email,
    password, // Store hashed password for username-based login
    ip_address: ipAddress,
    role: "player",
    points: 0,
    is_banned: false,
    is_muted: false,
    block_alliance_invites: false,
  })

  if (dbError) {
    console.error("[v0] Database insert error:", dbError)
    // Clean up auth user if database insert fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw new Error(`Database error: ${dbError.message}`)
  }

  // Track registration IP in user_ip_history
  const { data: userData } = await supabase.from("users").select("id").eq("auth_user_id", authData.user.id).single()

  if (userData) {
    await supabase.from("user_ip_history").insert({
      user_id: userData.id,
      ip_address: ipAddress,
      access_count: 1,
    })
  }

  console.log("[v0] User registration complete")

  return { user: authData.user, session: authData.session }
}

export async function signInWithUsername(username: string, password: string, ipAddress: string) {
  const supabase = createBrowserClient()

  console.log("[v0] Starting login with username:", username)

  // Look up email from username
  const { data: userData, error: lookupError } = await supabase
    .from("users")
    .select("email, id, password")
    .eq("username", username)
    .single()

  if (lookupError || !userData) {
    console.error("[v0] Username lookup error:", lookupError)
    throw new Error("Invalid username or password")
  }

  console.log("[v0] Found user, attempting Supabase auth login")

  // Sign in with Supabase Auth using email
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password,
  })

  if (authError) {
    console.error("[v0] Supabase auth login error:", authError)
    throw new Error("Invalid username or password")
  }

  console.log("[v0] Login successful, tracking IP")

  // Track login IP in user_ip_history
  const { data: ipHistory } = await supabase
    .from("user_ip_history")
    .select("*")
    .eq("user_id", userData.id)
    .eq("ip_address", ipAddress)
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
    // Insert new IP record
    await supabase.from("user_ip_history").insert({
      user_id: userData.id,
      ip_address: ipAddress,
      access_count: 1,
    })
  }

  return { user: authData.user, session: authData.session }
}

export async function getCurrentUser() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get full user data from public.users table
  const { data: userData } = await supabase.from("users").select("*").eq("auth_user_id", user.id).single()

  return userData
}

export async function signOut() {
  const supabase = createBrowserClient()
  await supabase.auth.signOut()
}
