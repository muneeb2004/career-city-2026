import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateJWT, hashPassword, UserRole } from "@/lib/auth";
import { getAdminSettings } from "@/lib/settings";

interface SignupRequestBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupRequestBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const { count, error: countError } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true });

    if (countError) {
      console.error("Supabase count error", countError);
      return NextResponse.json(
        { error: "Unable to verify existing users." },
        { status: 500 }
      );
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Signup is disabled after initial super admin registration." },
        { status: 403 }
      );
    }

    const passwordHash = await hashPassword(password);

    const { data: createdUser, error: createError } = await supabaseAdmin
      .from("users")
      .insert({
        email,
        password_hash: passwordHash,
        role: "super_admin" as UserRole,
      })
      .select("id, role")
      .maybeSingle();

    if (createError || !createdUser) {
      console.error("Supabase create user error", createError);
      return NextResponse.json(
        { error: "Unable to create super admin user." },
        { status: 500 }
      );
    }

  const adminSettings = await getAdminSettings();
  const jwtTtlHours = adminSettings.jwtTtlHours;
  const token = await generateJWT(createdUser.id, createdUser.role as UserRole, `${jwtTtlHours}h`);

    const response = NextResponse.json({
      token,
      user: { id: createdUser.id, role: createdUser.role },
    });

    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: jwtTtlHours * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error("Signup handler error", err);
    return NextResponse.json(
      { error: "Unexpected error during signup." },
      { status: 500 }
    );
  }
}
