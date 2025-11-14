import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { comparePassword, generateJWT, UserRole } from "@/lib/auth";
import { getAdminSettings } from "@/lib/settings";

interface LoginRequestBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdminClient();
    const body = (await request.json()) as LoginRequestBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, password_hash, role")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Supabase query error", error);
      return NextResponse.json(
        { error: "Unable to process login at this time." },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const adminSettings = await getAdminSettings();
    const jwtTtlHours = adminSettings.jwtTtlHours;
    const expiresIn = `${jwtTtlHours}h`;
    const token = await generateJWT(user.id, user.role as UserRole, expiresIn);

    const response = NextResponse.json({
      token,
      user: { id: user.id, role: user.role },
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
    console.error("Login handler error", err);
    return NextResponse.json(
      { error: "Unexpected error during login." },
      { status: 500 }
    );
  }
}
