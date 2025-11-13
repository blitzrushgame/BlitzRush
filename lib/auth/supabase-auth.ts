import { createBrowserClient } from "@/lib/supabase/client"

export async function signupClient(username: string, email: string, password: string, ip: string) {
  const supabase = createBrowserClient()

  console.log("Starting signup process for username:", username)

  // Input validation
  if (!username || !email || !password) {
    return { success: false, error: "All fields are required" }
  }

  if (username.length < 3) {
    return { success: false, error: "Username must be at least 3 characters" }
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" }
  }

  if (!email.includes('@')) {
    return { success: false, error: "Valid email is required" }
  }

  try {
    // Check if username exists
    const { data: existingUser, error: lookupError } = await supabase
      .from("users")
      .select("id")
      .ilike("username", username)
      .single()

    if (lookupError && lookupError.code !== 'PGRST116') {
      console.error("Error checking username:", lookupError)
      return { success: false, error: "Error checking username availability" }
    }

    if (existingUser) {
      return { success: false, error: "Username already taken" }
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          ip_address: ip
        },
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/game`
      }
    })

    if (authError) {
      console.error("Auth error:", authError)
      
      if (authError.message?.includes("already registered")) {
        return { 
          success: false, 
          error: "Email already registered. Please use a different email or try logging in." 
        }
      }
      
      return { 
        success: false, 
        error: authError.message || "Failed to create account" 
      }
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create user account" }
    }

    console.log("Auth user created, waiting for database trigger...")

    // Wait for trigger to create profile (with timeout)
    let profileCheck = null
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const { data: check } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single()
        
      if (check) {
        profileCheck = check
        break
      }
    }

    if (!profileCheck) {
      console.log("Trigger failed, creating profile manually...")
      
      const { data: manualProfile, error: profileError } = await supabase
        .from("users")
        .insert({
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
        .select("id")
        .single()

      if (profileError) {
        console.error("Manual profile creation failed:", profileError)
        return {
          success: false,
          error: `Failed to create user profile: ${profileError.message}`
        }
      }

      profileCheck = manualProfile
    }

    // Track IP
    await supabase.from("user_ip_history").insert({
      user_id: profileCheck.id,
      ip_address: ip,
      access_count: 1,
    })

    return { 
      success: true, 
      message: authData.session ? "Account created successfully!" : "Account created! Please check your email to verify your account."
    }

  } catch (error) {
    console.error("Unexpected error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function loginClient(username: string, password: string, ip: string) {
  const supabase = createBrowserClient()

  console.log("Login attempt for username:", username)

  if (!username || !password) {
    return { success: false, error: "Username and password are required" }
  }

  try {
    // Find user by username
    const { data: userData, error: lookupError } = await supabase
      .from("users")
      .select("email, id, is_banned, username, auth_user_id")
      .ilike("username", username)
      .single()

    if (lookupError || !userData) {
      return { success: false, error: "Invalid username or password" }
    }

    if (userData.is_banned) {
      return { success: false, error: "Account is banned" }
    }

    // Sign in with Supabase Auth using email
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password,
    })

    if (signInError) {
      console.error("Auth sign in error:", signInError)
      return { success: false, error: "Invalid username or password" }
    }

    if (!signInData.user) {
      return { success: false, error: "Login failed" }
    }

    // Sync auth_user_id if needed
    if (!userData.auth_user_id || userData.auth_user_id !== signInData.user.id) {
      await supabase
        .from("users")
        .update({ auth_user_id: signInData.user.id })
        .eq("id", userData.id)
    }

    // Track IP
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

    console.log("Login successful for user:", userData.username)
    return { success: true, user: userData }

  } catch (error) {
    console.error("Unexpected login error:", error)
    return { success: false, error: "An unexpected error occurred during login" }
  }
}
