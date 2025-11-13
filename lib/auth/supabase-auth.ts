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
    // Check if username exists - FIXED: Use eq instead of ilike
    const { data: existingUser, error: lookupError } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single()

    if (lookupError && lookupError.code !== 'PGRST116') {
      console.error("Error checking username:", lookupError)
      return { success: false, error: "Error checking username availability" }
    }

    if (existingUser) {
      return { success: false, error: "Username already taken" }
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (existingEmail) {
      return { success: false, error: "Email already registered" }
    }

    // Create auth user - SIMPLIFIED: No additional options that might cause conflicts
    console.log("Creating Supabase Auth user...")
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Remove any additional data that might conflict with your schema
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (authError) {
      console.error("Auth error:", authError)
      
      // Handle specific error cases
      if (authError.message?.includes("already registered") || authError.status === 422) {
        return { 
          success: false, 
          error: "Email already registered. Please use a different email." 
        }
      }
      
      if (authError.message?.includes("Database error")) {
        return {
          success: false,
          error: "Authentication service error. Please try again later."
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

    console.log("Auth user created successfully:", authData.user.id)

    // Wait a moment for any database triggers
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Check if profile was created by trigger
    const { data: autoProfile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", authData.user.id)
      .single()

    if (autoProfile) {
      console.log("User profile created automatically by trigger")
      
      // Update the auto-created profile with our data
      const { error: updateError } = await supabase
        .from("users")
        .update({
          username,
          email,
          ip_address: ip,
          email_verified: authData.user.confirmed_at ? true : false,
        })
        .eq("auth_user_id", authData.user.id)

      if (updateError) {
        console.error("Error updating auto-created profile:", updateError)
      }
    } else {
      // Create user profile manually
      console.log("Creating user profile manually...")
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
          email_verified: authData.user.confirmed_at ? true : false,
        })
        .select("id")
        .single()

      if (profileError) {
        console.error("Profile creation failed:", profileError)
        return {
          success: false,
          error: `Failed to create user profile: ${profileError.message}`
        }
      }
      console.log("User profile created manually:", manualProfile.id)
    }

    // Track IP (non-critical, continue even if this fails)
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single()

      if (userData) {
        await supabase.from("user_ip_history").insert({
          user_id: userData.id,
          ip_address: ip,
          access_count: 1,
        })
        console.log("IP history tracked")
      }
    } catch (ipError) {
      console.error("Failed to track IP:", ipError)
      // Continue anyway
    }

    // Return success
    if (authData.user.confirmed_at) {
      return { 
        success: true, 
        message: "Account created successfully! You can now log in.",
        requiresEmailVerification: false
      }
    } else {
      return { 
        success: true, 
        message: "Account created! Please check your email to verify your account.",
        requiresEmailVerification: true
      }
    }

  } catch (error: any) {
    console.error("Unexpected error during registration:", error)
    return { 
      success: false, 
      error: error.message || "An unexpected error occurred" 
    }
  }
}

export async function loginClient(username: string, password: string, ip: string) {
  const supabase = createBrowserClient()

  console.log("Login attempt for username:", username)

  if (!username || !password) {
    return { success: false, error: "Username and password are required" }
  }

  try {
    // Find user by username - FIXED: Use eq instead of ilike
    const { data: userData, error: lookupError } = await supabase
      .from("users")
      .select("email, id, is_banned, username, auth_user_id, email_verified")
      .eq("username", username)
      .single()

    if (lookupError || !userData) {
      console.log("User lookup failed:", lookupError)
      return { success: false, error: "Invalid username or password" }
    }

    if (userData.is_banned) {
      return { success: false, error: "Account is banned" }
    }

    // Check if email is verified
    if (!userData.email_verified) {
      return { 
        success: false, 
        error: "Please verify your email address before logging in." 
      }
    }

    // Sign in with Supabase Auth
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password,
    })

    if (signInError) {
      console.error("Auth sign in error:", signInError)
      
      if (signInError.message.includes("Invalid login credentials")) {
        return { success: false, error: "Invalid username or password" }
      }
      
      return { success: false, error: signInError.message || "Login failed" }
    }

    if (!signInData.user) {
      return { success: false, error: "Login failed" }
    }

    // Update verification status if needed
    if (signInData.user.confirmed_at && !userData.email_verified) {
      await supabase
        .from("users")
        .update({ email_verified: true })
        .eq("id", userData.id)
    }

    // Sync auth_user_id if needed
    if (!userData.auth_user_id || userData.auth_user_id !== signInData.user.id) {
      await supabase
        .from("users")
        .update({ auth_user_id: signInData.user.id })
        .eq("id", userData.id)
    }

    // Track IP
    try {
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
    } catch (ipError) {
      console.error("Failed to track IP:", ipError)
    }

    console.log("Login successful for user:", userData.username)
    return { success: true, user: userData }

  } catch (error: any) {
    console.error("Unexpected login error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function resendVerificationEmail(email: string) {
  const supabase = createBrowserClient()

  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (error) {
      console.error("Error resending verification email:", error)
      return { success: false, error: error.message }
    }

    return { success: true, message: "Verification email sent!" }
  } catch (error) {
    console.error("Unexpected error:", error)
    return { success: false, error: "Failed to resend verification email" }
  }
}
