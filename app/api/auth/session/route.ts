import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/simple-auth"

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ userId: null }, { status: 401 })
  }

  return NextResponse.json({ userId: user.id, username: user.username })
}
