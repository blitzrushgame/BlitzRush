import { createClient } from "@/lib/supabase/server"

/**
 * Get the current authenticated user from Supabase Auth
 * Returns user data from public.users table
 */
export async function getCurrentUser() {
  const supabase = await createClient()

  // Get the current auth user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return null
  }

  // Get the user data from public.users table
  const { data: userData, error } = await supabase.from("users").select("*").eq("auth_user_id", authUser.id).single()

  if (error || !userData) {
    return null
  }

  return userData
}

/**
 * Server-side signup function
 */
export async function signup(username: string, password: string, ip: string, email?: string) {
  const supabase = await createClient()

  // Use username as email if email not provided (for backwards compatibility)
  const userEmail = email || `${username}@blitzrush.local`

  // Check if username already exists
  const { data: existingUser } = await supabase.from("users").select("id").eq("username", username).single()

  if (existingUser) {
    return { success: false, error: "Username already taken" }
  }

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: userEmail,
    password,
    options: {
      emailRedirectTo:
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/game`,
    },
  })

  if (authError || !authData.user) {
    return { success: false, error: authError?.message || "Failed to create account" }
  }

  // Create user record in public.users table
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
  })

  if (userError) {
    return { success: false, error: "Failed to create user profile" }
  }

  // Track registration IP
  const { data: userData } = await supabase.from("users").select("id").eq("auth_user_id", authData.user.id).single()

  if (userData) {
    await supabase.from("user_ip_history").insert({
      user_id: userData.id,
      ip_address: ip,
      access_count: 1,
    })
  }

  return { success: true }
}
