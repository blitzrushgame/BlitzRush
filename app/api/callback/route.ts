import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    return NextResponse.redirect(`${requestUrl.origin}/?error=auth_failed&message=${encodeURIComponent(errorDescription || 'Authentication failed')}`)
  }

  if (code) {
    const supabase = await createClient()
    
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError)
      return NextResponse.redirect(`${requestUrl.origin}/?error=invalid_code&message=Invalid verification code`)
    }

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Update email verification status in users table
      await supabase
        .from('users')
        .update({ email_verified: true })
        .eq('auth_user_id', user.id)
    }

    // Redirect to game page after successful verification
    return NextResponse.redirect(`${requestUrl.origin}/game`)
  }

  // If no code or error, redirect to home
  return NextResponse.redirect(`${requestUrl.origin}/`)
}
