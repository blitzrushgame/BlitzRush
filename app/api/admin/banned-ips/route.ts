import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = cookies();
  const isAdmin = cookieStore.get("admin_authenticated")?.value === "true";

  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServerClient();
  const { data, error } = await supabase.from("banned_ips").select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
