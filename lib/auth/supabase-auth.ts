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
        password: password,
      },
    },
  })

  if (authError) {
    console.error("[v0] Auth error details:", authError)

    // Check if error is because user already exists
    if (authError.message?.includes("already registered") || authError.message?.includes("already been registered")) {
      console.log("[v0] Auth user exists, checking if profile exists...")

      // Try to find existing auth user and create profile for them
      const { data: signInData } = await supabase.auth.signInWithPassword({ email, password })

      if (signInData?.user) {
        console.log("[v0] Found existing auth user, checking for profile...")

        const { data: existingProfile } = await supabase
          .from("users")
          .select("id")
          .eq("auth_user_id", signInData.user.id)
          .single()

        if (!existingProfile) {
          console.log("[v0] No profile found, creating profile for existing auth user...")

          const { data: newProfile, error: profileError } = await supabase
            .from("users")
            .insert({
              auth_user_id: signInData.user.id,
              username,
              email,
              password: password,
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
            console.error("[v0] Failed to create profile for existing auth user:", profileError)
            return { success: false, error: `Failed to create profile: ${profileError.message}` }
          }

          console.log("[v0] Profile created successfully for existing auth user")

          // Track registration IP
          await supabase.from("user_ip_history").insert({
            user_id: newProfile.id,
            ip_address: ip,
            access_count: 1,
          })

          return { success: true }
        } else {
          console.log("[v0] Profile already exists for this auth user")
          return { success: false, error: "User already registered" }
        }
      }
    }

    return { success: false, error: authError.message || "Failed to create account" }
  }

  if (!authData.user) {
    console.error("[v0] No auth user returned")
    return { success: false, error: "Failed to create account" }
  }

  console.log("[v0] Auth user created with ID:", authData.user.id)
  console.log("[v0] Waiting for database trigger to create user profile...")

  // Wait for trigger to create profile
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const { data: profileCheck } = await supabase
    .from("users")
    .select("id, username, email")
    .eq("auth_user_id", authData.user.id)
    .single()

  console.log("[v0] Profile verification:", profileCheck)

  if (!profileCheck) {
    console.log("[v0] Trigger did not create profile. Creating manually as fallback...")

    const { data: manualProfile, error: profileError } = await supabase
      .from("users")
      .insert({
        auth_user_id: authData.user.id,
        username,
        email,
        password: password,
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
      console.error("[v0] Failed to create user profile manually. Full error details:", {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code,
      })
      return {
        success: false,
        error: `Database error: ${profileError.message}${profileError.details ? " - " + profileError.details : ""}${profileError.hint ? " (Hint: " + profileError.hint + ")" : ""}`,
      }
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
    .select("email, id, is_banned, username, auth_user_id, password")
    .ilike("username", username)
    .single()

  console.log("[v0] User lookup result:", { userData, lookupError })

  if (lookupError || !userData) {
    console.log("[v0] User not found")
    return { success: false, error: "Invalid username or password" }
  }

  console.log("[v0] Found user:", userData.username)

  if (userData.is_banned) {
    console.log("[v0] User is banned")
    return { success: false, error: "Account is banned" }
  }

  if (userData.password !== password) {
    console.log("[v0] Password mismatch")
    return { success: false, error: "Invalid username or password" }
  }

  console.log("[v0] Password verified, signing in with Supabase Auth for session")

  // Sign in with Supabase Auth to create session
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password,
  })

  if (signInError) {
    console.log("[v0] Supabase Auth sign in failed, but password was correct. Continuing anyway.")
  }

  console.log("[v0] Logging IP address")

  if (signInData?.user && (!userData.auth_user_id || userData.auth_user_id !== signInData.user.id)) {
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
