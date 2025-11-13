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

    // Check if email already exists in users table
    const { data: existingEmail } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (existingEmail) {
      return { success: false, error: "Email already registered" }
    }

    // Create auth user - SIMPLIFIED without additional metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // Remove the data field to avoid database conflicts
      }
    })

    if (authError) {
      console.error("Auth error details:", {
        message: authError.message,
        name: authError.name,
        status: authError.status
      })

      if (authError.message?.includes("already registered") || authError.status === 422) {
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

    console.log("Auth user created successfully:", authData.user.id)

    // Create user profile in public.users table
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
        email_verified: false,
        // Note: We're NOT storing the password in the public.users table
        // The password is only stored in Supabase Auth
      })
      .select("id")
      .single()

    if (profileError) {
      console.error("Profile creation failed:", profileError)
      
      // Try to clean up auth user if profile creation fails
      try {
        // This requires service role key, might not work client-side
        console.log("Attempting to clean up auth user...")
      } catch (e) {
        console.error("Failed to clean up auth user:", e)
      }
      
      return {
        success: false,
        error: `Failed to create user profile: ${profileError.message}`
      }
    }

    // Track IP
    await supabase.from("user_ip_history").insert({
      user_id: manualProfile.id,
      ip_address: ip,
      access_count: 1,
    })

    // Return success with verification info
    if (authData.user.confirmed_at) {
      return { 
        success: true, 
        message: "Account created successfully! You can now log in.",
        requiresEmailVerification: false
      }
    } else {
      return { 
        success: true, 
        message: "Account created! Please check your email to verify your account before logging in.",
        requiresEmailVerification: true
      }
    }

  } catch (error: any) {
    console.error("Unexpected error:", error)
    return { success: false, error: "An unexpected error occurred during registration" }
  }
}

export async function loginClient(username: string, password: string, ip: string) {
  const supabase = createBrowserClient()

  console.log("Login attempt for username:", username)

  if (!username || !password) {
    return { success: false, error: "Username and password are required" }
  }

  try {
    // Find user by username to get their email
    const { data: userData, error: lookupError } = await supabase
      .from("users")
      .select("email, id, is_banned, username, auth_user_id, email_verified")
      .ilike("username", username)
      .single()

    if (lookupError || !userData) {
      return { success: false, error: "Invalid username or password" }
    }

    if (userData.is_banned) {
      return { success: false, error: "Account is banned" }
    }

    // Check if email is verified
    if (!userData.email_verified) {
      return { 
        success: false, 
        error: "Please verify your email address before logging in. Check your inbox for the verification link." 
      }
    }

    // Sign in with Supabase Auth using email
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password,
    })

    if (signInError) {
      console.error("Auth sign in error:", signInError)
      
      // Provide more specific error messages
      if (signInError.message.includes("Invalid login credentials")) {
        return { success: false, error: "Invalid username or password" }
      } else if (signInError.message.includes("Email not confirmed")) {
        return { 
          success: false, 
          error: "Please verify your email address before logging in." 
        }
      }
      
      return { success: false, error: signInError.message || "Login failed" }
    }

    if (!signInData.user) {
      return { success: false, error: "Login failed" }
    }

    // Update email verification status if needed
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

  } catch (error: any) {
    console.error("Unexpected login error:", error)
    return { success: false, error: "An unexpected error occurred during login" }
  }
}

// New function to resend verification email
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

    return { success: true, message: "Verification email sent! Please check your inbox." }
  } catch (error) {
    console.error("Unexpected error resending verification:", error)
    return { success: false, error: "Failed to resend verification email" }
  }
}
