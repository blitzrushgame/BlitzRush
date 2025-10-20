import { type NextRequest, NextResponse } from "next/server"

// Manual trigger for testing (should be removed in production or protected)
export async function POST(request: NextRequest) {
  try {
    // Get user session to verify they're logged in
    const sessionResponse = await fetch(new URL("/api/auth/session", request.url).toString(), {
      headers: request.headers,
    })
    const sessionData = await sessionResponse.json()

    if (!sessionData.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Call the cron endpoint
    const cronResponse = await fetch(new URL("/api/cron/game-tick", request.url).toString(), {
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    })

    const data = await cronResponse.json()

    return NextResponse.json({
      success: true,
      cronResult: data,
    })
  } catch (error) {
    console.error("Error triggering manual tick:", error)
    return NextResponse.json({ error: "Failed to trigger game tick" }, { status: 500 })
  }
}
