import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const cookieStore = cookies();
  const isAdmin = cookieStore.get("admin_authenticated")?.value === "true";

  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ip, reason } = await request.json();

  // IP validation
  const ipRegex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  if (!ipRegex.test(ip)) return NextResponse.json({ error: "Invalid IP" }, { status: 400 });

  const supabase = await createServerClient();
  const { error } = await supabase.from("banned_ips").insert({ ip_address: ip, reason });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
