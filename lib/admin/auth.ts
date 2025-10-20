import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface AdminUser {
  id: number
  email: string
  role: string
  is_active: boolean
  whitelisted_ips: string[] | null
  last_login: string | null
}

export interface AdminSession {
  adminId: number
  email: string
  role: string
  loginTime: number
}

const ADMIN_SESSION_COOKIE = "admin_session"
const SESSION_DURATION = 8 * 60 * 60 * 1000 // 8 hours

const HARDCODED_AUTHORIZED_IPS = ["76.131.154.231"]

/**
 * Get whitelisted IPs from environment variable
 */
export function getWhitelistedIPs(): string[] {
  const ips = process.env.ADMIN_WHITELIST_IPS || ""
  const envIPs = ips
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean)

  return [...envIPs, ...HARDCODED_AUTHORIZED_IPS]
}

/**
 * Check if an IP address is whitelisted
 */
export function isIPWhitelisted(ip: string): boolean {
  if (ip === "unknown") {
    console.log("[v0] IP detection failed, allowing access in development mode")
    return true
  }

  const whitelist = getWhitelistedIPs()
  if (whitelist.length === 0) return true // No whitelist = allow all
  return whitelist.includes(ip)
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(request: Request): string {
  // Try multiple headers in order of preference
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  const cfConnectingIP = request.headers.get("cf-connecting-ip") // Cloudflare
  const trueClientIP = request.headers.get("true-client-ip") // Cloudflare Enterprise
  const xClientIP = request.headers.get("x-client-ip")

  console.log("[v0] IP Headers:", {
    forwarded,
    realIP,
    cfConnectingIP,
    trueClientIP,
    xClientIP,
  })

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  if (realIP) return realIP
  if (cfConnectingIP) return cfConnectingIP
  if (trueClientIP) return trueClientIP
  if (xClientIP) return xClientIP

  // In development/preview, allow "unknown" to pass if no whitelist is set
  return "unknown"
}

/**
 * Verify admin credentials and return admin user if valid
 */
export async function verifyAdminCredentials(email: string, password: string): Promise<AdminUser | null> {
  const supabase = createServiceRoleClient()

  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("email", email)
    .eq("is_active", true)
    .single()

  if (error || !admin) {
    console.log("[v0] Admin not found or inactive:", email)
    return null
  }

  const isValidPassword = await bcrypt.compare(password, admin.password_hash)

  if (!isValidPassword) {
    console.log("[v0] Invalid password for admin:", email)
    return null
  }

  return admin as AdminUser
}

/**
 * Create admin session cookie
 */
export async function createAdminSession(admin: AdminUser): Promise<void> {
  const session: AdminSession = {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    loginTime: Date.now(),
  }

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION / 1000,
    path: "/",
  })

  // Update last_login timestamp
  const supabase = createServiceRoleClient()
  await supabase.from("admin_users").update({ last_login: new Date().toISOString() }).eq("id", admin.id)
}

/**
 * Get current admin session
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)

  if (!sessionCookie) {
    return null
  }

  try {
    const session: AdminSession = JSON.parse(sessionCookie.value)

    // Check if session is expired
    if (Date.now() - session.loginTime > SESSION_DURATION) {
      await destroyAdminSession()
      return null
    }

    return session
  } catch (error) {
    console.error("[v0] Error parsing admin session:", error)
    return null
  }
}

/**
 * Destroy admin session (logout)
 */
export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_SESSION_COOKIE)
}

/**
 * Require admin authentication - throws if not authenticated
 */
export async function requireAdminAuth(): Promise<AdminSession> {
  const session = await getAdminSession()

  if (!session) {
    throw new Error("Unauthorized: Admin authentication required")
  }

  return session
}

/**
 * Initialize admin user with hashed password
 * This should be run once to set up the admin account
 */
export async function initializeAdminUser(email: string, password: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const passwordHash = await bcrypt.hash(password, 10)

  const { error } = await supabase.from("admin_users").upsert(
    {
      email,
      password_hash: passwordHash,
      role: "super_admin",
      is_active: true,
    },
    {
      onConflict: "email",
    },
  )

  if (error) {
    console.error("[v0] Error initializing admin user:", error)
    throw error
  }

  console.log("[v0] Admin user initialized successfully:", email)
}
