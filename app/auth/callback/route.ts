import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Success! Redirect to a success page
      return NextResponse.redirect('https://blitzrush.vercel.app')
    }
  }

  // If error, redirect to error page
  return NextResponse.redirect('https://blitzrush.vercel.app/verification-error')
}
