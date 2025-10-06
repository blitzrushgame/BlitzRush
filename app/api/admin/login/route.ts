import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const ADMIN_USERNAME = "BlitzRushAdmin"
const ADMIN_PASSWORD = "19WBHEQLBS4S3BFCP2LE3PYH"

const loginAttempts = new Map<string, number>()
const RATE_LIMIT_MS = 5000 // 5 seconds

export async function POST(request: NextRequest) {
  try {
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    const now = Date.now()
    const lastAttempt = loginAttempts.get(ip)

    if (lastAttempt && now - lastAttempt < RATE_LIMIT_MS) {
      const remainingTime = Math.ceil((RATE_LIMIT_MS - (now - lastAttempt)) / 1000)
      return NextResponse.json({ error: `Too many attempts. Please wait ${remainingTime} seconds.` }, { status: 429 })
    }

    loginAttempts.set(ip, now)

    const { username, password } = await request.json()

    // Check credentials
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Set authentication cookie
      const cookieStore = await cookies()
      cookieStore.set("admin_authenticated", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
