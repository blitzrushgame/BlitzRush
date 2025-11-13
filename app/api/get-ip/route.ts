import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get client IP from headers (behind proxy)
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    
    let ip = forwarded?.split(',')[0] || realIp || request.ip
    
    // Fallback for local development
    if (!ip || ip === '::1') {
      ip = '127.0.0.1'
    }

    return NextResponse.json({ ip })
  } catch (error) {
    console.error('Error getting IP:', error)
    return NextResponse.json({ ip: '127.0.0.1' })
  }
}
