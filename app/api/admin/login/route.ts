import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminCredentials, createAdminSession, getClientIP, isIPWhitelisted } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_DURATION = 30 * 60 * 1000 // 30 minutes

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const userAgent = request.headers.get("user-agent") || "unknown"

  try {
    if (!isIPWhitelisted(ip)) {
      console.log("[v0] Admin login attempt from non-whitelisted IP:", ip)

      await logAdminAction({
        admin_id: null,
        admin_email: "unknown",
        action: "login_attempt",
        ip_address: ip,
        user_agent: userAgent,
        success: false,
        error_message: "IP not whitelisted",
      })

      return NextResponse.json({ error: "Access denied: Your IP address is not authorized" }, { status: 403 })
    }

    const now = Date.now()
    const attempts = loginAttempts.get(ip)

    if (attempts) {
      // Check if locked out
      if (attempts.count >= MAX_ATTEMPTS) {
        const timeSinceLast = now - attempts.lastAttempt
        if (timeSinceLast < LOCKOUT_DURATION) {
          const remainingMinutes = Math.ceil((LOCKOUT_DURATION - timeSinceLast) / 60000)
          return NextResponse.json(
            { error: `Too many failed attempts. Account locked for ${remainingMinutes} minutes.` },
            { status: 429 },
          )
        } else {
          // Reset after lockout period
          loginAttempts.delete(ip)
        }
      }

      // Check rate limit window
      if (now - attempts.lastAttempt < RATE_LIMIT_WINDOW) {
        attempts.count++
        attempts.lastAttempt = now
      } else {
        // Reset if outside window
        loginAttempts.set(ip, { count: 1, lastAttempt: now })
      }
    } else {
      loginAttempts.set(ip, { count: 1, lastAttempt: now })
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    console.log("[v0] Admin login attempt for:", email, "from IP:", ip)

    const admin = await verifyAdminCredentials(email, password)

    if (!admin) {
      console.log("[v0] Invalid admin credentials for:", email)

      await logAdminAction({
        admin_id: null,
        admin_email: email,
        action: "login_failed",
        ip_address: ip,
        user_agent: userAgent,
        success: false,
        error_message: "Invalid credentials",
      })

      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (admin.whitelisted_ips && admin.whitelisted_ips.length > 0 && ip !== "unknown") {
      if (!admin.whitelisted_ips.includes(ip)) {
        console.log("[v0] Admin IP not in personal whitelist:", ip)

        await logAdminAction({
          admin_id: admin.id,
          admin_email: admin.email,
          action: "login_blocked",
          ip_address: ip,
          user_agent: userAgent,
          success: false,
          error_message: "IP not in admin whitelist",
        })

        return NextResponse.json(
          { error: "Access denied: Your IP is not authorized for this admin account" },
          { status: 403 },
        )
      }
    }

    await createAdminSession(admin)

    await logAdminAction({
      admin_id: admin.id,
      admin_email: admin.email,
      action: "login_success",
      ip_address: ip,
      user_agent: userAgent,
      success: true,
    })

    // Reset failed attempts on successful login
    loginAttempts.delete(ip)

    console.log("[v0] Admin login successful:", admin.email)

    return NextResponse.json({ success: true, admin: { email: admin.email, role: admin.role } })
  } catch (error) {
    console.error("[v0] Admin login error:", error)

    await logAdminAction({
      admin_id: null,
      admin_email: "unknown",
      action: "login_error",
      ip_address: ip,
      user_agent: userAgent,
      success: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    })

    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
