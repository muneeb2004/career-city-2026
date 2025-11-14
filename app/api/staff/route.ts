import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";

async function requireStaffAccess(request: NextRequest) {
  const cookieToken = request.cookies.get("token")?.value;
  const bearerToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const token = cookieToken ?? bearerToken ?? null;

  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    const payload = await verifyJWT(token);
    if (!["super_admin", "staff"].includes(payload.role)) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { payload };
  } catch (error) {
    console.error("staff list token verification failed", error);
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireStaffAccess(request);
  if ("error" in auth) {
    return auth.error;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, role, created_at")
    .in("role", ["super_admin", "staff"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch staff list", error);
    return NextResponse.json({ error: "Unable to load staff right now." }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}