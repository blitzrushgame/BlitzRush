import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MS = 3000 // 3 seconds between attempts

export async function POST(request: NextRequest) {
  try {
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    const now = Date.now()

    // Check rate limiting
    const attempts = loginAttempts.get(ip)
    if (attempts) {
      if (attempts.count >= MAX_ATTEMPTS) {
        const timeSinceLast = now - attempts.lastAttempt
        if (timeSinceLast < LOCKOUT_TIME) {
          const remainingTime = Math.ceil((LOCKOUT_TIME - timeSinceLast) / 1000 / 60)
          return NextResponse.json(
            { error: `Account locked. Too many failed attempts. Try again in ${remainingTime} minutes.` },
            { status: 429 },
          )
        } else {
          // Reset after lockout period
          loginAttempts.delete(ip)
        }
      } else if (now - attempts.lastAttempt < RATE_LIMIT_MS) {
        const remainingTime = Math.ceil((RATE_LIMIT_MS - (now - attempts.lastAttempt)) / 1000)
        return NextResponse.json({ error: `Too many attempts. Please wait ${remainingTime} seconds.` }, { status: 429 })
      }
    }

    const { username, password } = await request.json()

    console.log("[v0] Admin login attempt for:", username, "from IP:", ip)

    // Check credentials against admin_users table
    const supabase = createServiceRoleClient()
    const { data: admin, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", username)
      .eq("is_active", true)
      .single()

    if (error || !admin) {
      console.log("[v0] Admin not found or inactive:", username)
      // Track failed attempt
      const currentAttempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 }
      loginAttempts.set(ip, { count: currentAttempts.count + 1, lastAttempt: now })
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Check password (plaintext comparison)
    if (admin.password_hash !== password) {
      console.log("[v0] Invalid password for admin:", username)
      // Track failed attempt
      const currentAttempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 }
      loginAttempts.set(ip, { count: currentAttempts.count + 1, lastAttempt: now })
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Check IP whitelist if configured
    if (admin.whitelisted_ips && admin.whitelisted_ips.length > 0 && ip !== "unknown") {
      if (!admin.whitelisted_ips.includes(ip)) {
        console.log("[v0] Admin IP not in whitelist:", ip)
        return NextResponse.json({ error: "Unauthorized IP address" }, { status: 403 })
      }
    }

    // Clear failed attempts on successful login
    loginAttempts.delete(ip)

    // Update last login
    await supabase.from("admin_users").update({ last_login: new Date().toISOString() }).eq("id", admin.id)

    // Set admin session cookie
    const cookieStore = await cookies()
    const sessionData = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    }

    cookieStore.set("admin_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
    })

    cookieStore.set("admin_authenticated", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
    })

    console.log("[v0] Admin login successful:", username)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Admin login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
