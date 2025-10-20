"use server"

import { createClient } from "@/lib/supabase/server"

export async function getCurrentUser() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get the user profile from the custom users table
  const { data: profile } = await supabase.from("users").select("*").eq("auth_user_id", user.id).maybeSingle()

  return profile
}
