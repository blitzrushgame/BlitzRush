import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")

  if (userId) {
    return NextResponse.json({ authenticated: true, userId: userId.value })
  }

  return NextResponse.json({ authenticated: false })
}
