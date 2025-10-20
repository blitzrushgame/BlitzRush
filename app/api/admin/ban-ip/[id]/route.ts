import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";

export async function DELETE({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const isAdmin = cookieStore.get("admin_authenticated")?.value === "true";

  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServerClient();
  const { error } = await supabase.from("banned_ips").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
