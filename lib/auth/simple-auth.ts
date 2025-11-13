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

export async function signup(username: string, password: string, ip: string, email?: string) {
  const supabase = await createClient()

  // Validate input
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
    // Check if username already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Error checking username:", checkError)
      return { success: false, error: "Database error checking username" }
    }

    if (existingUser) {
      return { success: false, error: "Username already taken" }
    }

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userEmail,
      password,
      options: {
        data: {
          username,
          ip_address: ip
        },
        emailRedirectTo: process.env.NODE_ENV === 'development' 
          ? process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/game`
      }
    })

    if (authError) {
      console.error("Auth error:", authError)
      return { 
        success: false, 
        error: authError.message === 'User already registered' 
          ? "Email already registered" 
          : authError.message || "Failed to create account" 
      }
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create user account" }
    }

    // Create user profile WITHOUT password field
    const { error: userError } = await supabase
      .from("users")
      .insert({
        auth_user_id: authData.user.id,
        username,
        email: userEmail,
        ip_address: ip,
        role: "player",
        points: 0,
        is_banned: false,
        is_muted: false,
        block_alliance_invites: false,
      })

    if (userError) {
      console.error("User profile creation error:", userError)
      
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      
      return { 
        success: false, 
        error: `Failed to create user profile: ${userError.message}` 
      }
    }

    // Get the new user ID for IP tracking
    const { data: newUser } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", authData.user.id)
      .single()

    if (newUser) {
      await supabase.from("user_ip_history").insert({
        user_id: newUser.id,
        ip_address: ip,
        access_count: 1,
      })
    }

    return { 
      success: true, 
      message: authData.session ? "Account created successfully" : "Account created - please check your email to verify"
    }

  } catch (error) {
    console.error("Unexpected error during signup:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
