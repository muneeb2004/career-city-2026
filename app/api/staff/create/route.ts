import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { hashPassword, verifyJWT, UserRole } from "@/lib/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireSuperAdmin(request: NextRequest) {
  const cookieToken = request.cookies.get("token")?.value;
  const bearerToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const token = cookieToken ?? bearerToken ?? null;

  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    const payload = await verifyJWT(token);
    if (payload.role !== "super_admin") {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { payload };
  } catch (error) {
    console.error("staff/create token verification failed", error);
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
}

interface CreateStaffBody {
  email?: string;
  password?: string;
  role?: UserRole;
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { payload } = auth;

  const body = (await request.json().catch(() => null)) as CreateStaffBody | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password?.trim();
  const requestedRole = body?.role ?? "staff";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!["staff", "super_admin"].includes(requestedRole)) {
    return NextResponse.json({ error: "Invalid role selection." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: existingUser, error: existingError } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to verify staff email uniqueness", existingError);
    return NextResponse.json({ error: "Unable to create staff user right now." }, { status: 500 });
  }

  if (existingUser) {
    return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const { data: createdUser, error: createError } = await supabase
    .from("users")
    .insert({
      email,
      password_hash: passwordHash,
      role: requestedRole,
      created_by: payload.sub,
    })
    .select("id, email, role, created_at")
    .maybeSingle();

  if (createError || !createdUser) {
    console.error("Failed to create staff user", createError);
    return NextResponse.json({ error: "Unable to create staff user right now." }, { status: 500 });
  }

  return NextResponse.json({ user: createdUser }, { status: 201 });
}