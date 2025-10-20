import { type NextRequest, NextResponse } from "next/server"
import { initializeAdminUser } from "@/lib/admin/auth"

// This endpoint should be called once to initialize the admin user
// After initialization, this endpoint should be disabled or removed
export async function POST(request: NextRequest) {
  try {
    // Security check: only allow in development or with secret key
    const { secret } = await request.json()

    if (process.env.NODE_ENV === "production" && secret !== process.env.ADMIN_INIT_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Initialize admin user with credentials from environment or hardcoded
    const email = "blitzrushgame@gmail.com"
    const password = "19WBHEQLBS4S3BFCP2LE3PYH"

    await initializeAdminUser(email, password)

    return NextResponse.json({ success: true, message: "Admin user initialized" })
  } catch (error) {
    console.error("[v0] Admin initialization error:", error)
    return NextResponse.json({ error: "Initialization failed" }, { status: 500 })
  }
}
