import { createClient as createServerClient } from "@/lib/supabase/server"
import { createBrowserClient } from "@/lib/supabase/client"

// Server-side signup function
export async function signupServer(username: string, email: string, password: string, ip: string) {
  const supabase = await createServerClient()

  // Check if username already exists
  const { data: existingUser } = await supabase.from("users").select("id").eq("username", username).single()

  if (existingUser) {
    return { success: false, error: "Username already taken" }
  }

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
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
    email,
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

// Client-side signup function
export async function signupClient(username: string, email: string, password: string, ip: string) {
  const supabase = createBrowserClient()

  // Check if username already exists
  const { data: existingUser } = await supabase.from("users").select("id").eq("username", username).single()

  if (existingUser) {
    return { success: false, error: "Username already taken" }
  }

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/game`,
    },
  })

  if (authError || !authData.user) {
    return { success: false, error: authError?.message || "Failed to create account" }
  }

  // Create user record in public.users table
  const { error: userError } = await supabase.from("users").insert({
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

// Client-side login with username
export async function loginClient(username: string, password: string, ip: string) {
  const supabase = createBrowserClient()

  // Look up email from username
  const { data: userData, error: lookupError } = await supabase
    .from("users")
    .select("email, id, is_banned")
    .eq("username", username)
    .single()

  if (lookupError || !userData) {
    return { success: false, error: "Invalid username or password" }
  }

  if (userData.is_banned) {
    return { success: false, error: "Account is banned" }
  }

  // Sign in with email and password using Supabase Auth
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password,
  })

  if (signInError) {
    return { success: false, error: "Invalid username or password" }
  }

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

  return { success: true }
}

// Server-side login with username
export async function loginServer(username: string, password: string, ip: string) {
  const supabase = await createServerClient()

  // Look up email from username
  const { data: userData, error: lookupError } = await supabase
    .from("users")
    .select("email, id, is_banned")
    .eq("username", username)
    .single()

  if (lookupError || !userData) {
    return { success: false, error: "Invalid username or password" }
  }

  if (userData.is_banned) {
    return { success: false, error: "Account is banned" }
  }

  // Sign in with email and password using Supabase Auth
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password,
  })

  if (signInError) {
    return { success: false, error: "Invalid username or password" }
  }

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

  return { success: true }
}
