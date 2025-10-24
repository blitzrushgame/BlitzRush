import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith("/game")) {
    // User is logging out or session expired - despawn their base
    const cookies = request.cookies.getAll()
    const userIdCookie = cookies.find((c) => c.name.includes("user_id"))

    if (userIdCookie) {
      try {
        const serviceSupabase = createServiceRoleClient()
        await serviceSupabase
          .from("buildings")
          .update({ is_visible: false })
          .eq("user_id", userIdCookie.value)
          .eq("building_type", "base")
          .eq("is_home_base", true)

        console.log("[v0] Home base despawned for logged out user:", userIdCookie.value)
      } catch (error) {
        console.error("[v0] Error despawning base on logout:", error)
      }
    }

    return NextResponse.redirect(new URL("/", request.url))
  }

  if (user && request.nextUrl.pathname.startsWith("/game")) {
    try {
      const serviceSupabase = createServiceRoleClient()

      // Get user's database ID from auth_user_id
      const { data: userData } = await serviceSupabase.from("users").select("id").eq("auth_user_id", user.id).single()

      if (userData) {
        // Check if base is invisible and make it visible
        const { data: invisibleBase } = await serviceSupabase
          .from("buildings")
          .select("id")
          .eq("user_id", userData.id)
          .eq("building_type", "base")
          .eq("is_home_base", true)
          .eq("is_visible", false)
          .maybeSingle()

        if (invisibleBase) {
          await serviceSupabase.from("buildings").update({ is_visible: true }).eq("id", invisibleBase.id)

          console.log("[v0] Home base respawned for logged in user:", userData.id)
        }
      }
    } catch (error) {
      console.error("[v0] Error respawning base on login:", error)
    }
  }

  // Protect game routes - redirect to home if not authenticated
  if (!user && request.nextUrl.pathname.startsWith("/game")) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
