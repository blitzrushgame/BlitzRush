import { createBrowserClient } from "@/lib/supabase/client"

// Client-side signup function
export async function signupClient(username: string, email: string, password: string, ip: string) {
  const supabase = createBrowserClient()

  console.log("[v0] Starting signup process for username:", username)

  const { data: existingUser } = await supabase.from("users").select("id").ilike("username", username).single()

  if (existingUser) {
    console.log("[v0] Username already exists")
    return { success: false, error: "Username already taken" }
  }

  console.log("[v0] Creating Supabase Auth user with metadata...")
  // Create Supabase Auth user with metadata
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
  console.log("[v0] Waiting for database trigger to create user profile...")

  await new Promise((resolve) => setTimeout(resolve, 2000))

  const { data: profileCheck } = await supabase
    .from("users")
    .select("id, username, email")
    .eq("auth_user_id", authData.user.id)
    .single()

  console.log("[v0] Profile verification:", profileCheck)

  if (!profileCheck) {
    console.log("[v0] Trigger did not create profile. Creating manually as fallback...")

    // Manually create user profile if trigger didn't work
    const { data: manualProfile, error: profileError } = await supabase
      .from("users")
      .insert({
        auth_user_id: authData.user.id,
        username,
        email,
        password: null,
        ip_address: ip,
        role: "player",
        points: 0,
        is_banned: false,
        is_muted: false,
        block_alliance_invites: false,
      })
      .select("id")
      .single()

    if (profileError) {
      console.error("[v0] Failed to create user profile manually:", profileError)
      // Clean up auth user if profile creation failed
      await supabase.auth.admin.deleteUser(authData.user.id)
      return { success: false, error: "Failed to create user profile" }
    }

    console.log("[v0] User profile created manually with ID:", manualProfile.id)

    // Track registration IP
    await supabase.from("user_ip_history").insert({
      user_id: manualProfile.id,
      ip_address: ip,
      access_count: 1,
    })

    console.log("[v0] Registration IP tracked")
  } else {
    console.log("[v0] User profile created successfully by trigger")
  }

  return { success: true }
}

// Client-side login with username
export async function loginClient(username: string, password: string, ip: string) {
  const supabase = createBrowserClient()

  console.log("[v0] Looking up user by username:", username)

  const { data: userData, error: lookupError } = await supabase
    .from("users")
    .select("email, id, is_banned, username, auth_user_id")
    .ilike("username", username)
    .single()

  console.log("[v0] User lookup result:", { userData, lookupError })

  if (lookupError || !userData) {
    console.log("[v0] User not found. Checking if any users exist...")
    const { data: allUsers, count } = await supabase.from("users").select("username", { count: "exact" }).limit(5)
    console.log(
      "[v0] Total users in database:",
      count,
      "Sample usernames:",
      allUsers?.map((u) => u.username),
    )
    return { success: false, error: "Invalid username or password" }
  }

  console.log("[v0] Found user:", userData.username, "with email:", userData.email)

  if (userData.is_banned) {
    console.log("[v0] User is banned")
    return { success: false, error: "Account is banned" }
  }

  console.log("[v0] Attempting Supabase Auth sign in")

  // Sign in with email and password using Supabase Auth
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password,
  })

  if (signInError) {
    console.log("[v0] Sign in failed:", signInError.message)
    return { success: false, error: "Invalid username or password" }
  }

  console.log("[v0] Sign in successful, logging IP address")

  if (!userData.auth_user_id || userData.auth_user_id !== signInData.user.id) {
    console.log("[v0] Syncing auth_user_id for user:", userData.id)
    await supabase.from("users").update({ auth_user_id: signInData.user.id }).eq("id", userData.id)
  }

  const { data: ipHistory } = await supabase
    .from("user_ip_history")
    .select("id, access_count")
    .eq("user_id", userData.id)
    .eq("ip_address", ip)
    .single()

  if (ipHistory) {
    await supabase
      .from("user_ip_history")
      .update({
        last_seen: new Date().toISOString(),
        access_count: ipHistory.access_count + 1,
      })
      .eq("id", ipHistory.id)
  } else {
    await supabase.from("user_ip_history").insert({
      user_id: userData.id,
      ip_address: ip,
      access_count: 1,
    })
  }

  console.log("[v0] Login complete")
  return { success: true }
}
