import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const supabase = await createServerClient();
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  const { data: banned } = await supabase
    .from("banned_ips")
    .select("id")
    .eq("ip_address", ip)
    .single();

  if (banned) {
    return new NextResponse("Your IP is banned.", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    
    "/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
