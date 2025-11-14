import { createClient } from "@/lib/supabase/server"

export async function getCurrentUser() {
  const supabase = await createClient()
  
  const { data: { user: authUser }, error } = await supabase.auth.getUser()
  
  if (error || !authUser) {
    return null
  }

  // Get user data from public.users table
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", authUser.id)
    .single()

  if (userError || !userData) {
    return null
  }

  return userData
}

// Enhanced signup function that works with your schema
export async function signup(username: string, password: string, ip: string, email?: string) {
  const supabase = await createClient()

  // Input validation
  if (!username || !password) {
    return { success: false, error: "Username and password are required" }
  }

  if (username.length < 3) {
    return { success: false, error: "Username must be at least 3 characters" }
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" }
  }

  const userEmail = email || `${username}@blitzrush.local`

  try {
    // Check if username exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single()

    if (existingUser) {
      return { success: false, error: "Username already taken" }
    }

    // Create Supabase Auth user WITHOUT additional metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userEmail,
      password,
      options: {
        emailRedirectTo: `https://blitzrush.vercel.app/auth/callback`,
      },
    })

    if (authError || !authData.user) {
      return { 
        success: false, 
        error: authError?.message || "Failed to create account" 
      }
    }

    // Create user profile with email_verified flag
    const { error: userError } = await supabase.from("users").insert({
      auth_user_id: authData.user.id,
      username,
      email: userEmail,
      ip_address: ip,
      role: "player",
      points: 0,
      is_banned: false,
      is_muted: false,
      block_alliance_invites: false,
      email_verified: false, // Will be updated when user verifies email
    })

    if (userError) {
      return { success: false, error: "Failed to create user profile" }
    }

    // Get user ID for IP tracking
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
    }

    return { 
      success: true, 
      requiresEmailVerification: !authData.user.confirmed_at,
      message: authData.user.confirmed_at 
        ? "Account created successfully!" 
        : "Please check your email to verify your account."
    }

  } catch (error) {
    console.error("Unexpected error during signup:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
