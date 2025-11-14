import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
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
    console.error("staff/[id] token verification failed", error);
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
}

async function superAdminCount(excludeId?: string) {
  let query = supabaseAdmin.from("users").select("id", { count: "exact", head: true }).eq("role", "super_admin");

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { count, error } = await query;

  if (error) {
    console.error("Failed to count super admin users", error);
    return { error: NextResponse.json({ error: "Unable to verify super admin availability." }, { status: 500 }) };
  }

  return { count: count ?? 0 };
}

interface UpdateStaffBody {
  email?: string;
  password?: string;
  role?: UserRole;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) {
    return auth.error;
  }

  const targetId = params.id;

  const { data: existingUser, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("id, email, role, created_at")
    .eq("id", targetId)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to load user for update", fetchError);
    return NextResponse.json({ error: "Unable to update staff right now." }, { status: 500 });
  }

  if (!existingUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as UpdateStaffBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {};

  if (body.email !== undefined) {
    const nextEmail = body.email.trim().toLowerCase();
    if (!nextEmail) {
      return NextResponse.json({ error: "Email cannot be empty." }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(nextEmail)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (nextEmail !== existingUser.email) {
      const { data: conflict, error: conflictError } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", nextEmail)
        .maybeSingle();

      if (conflictError) {
        console.error("Failed to check email uniqueness", conflictError);
        return NextResponse.json({ error: "Unable to update staff right now." }, { status: 500 });
      }

      if (conflict && conflict.id !== targetId) {
        return NextResponse.json({ error: "Another user already uses that email." }, { status: 409 });
      }
    }

    updatePayload.email = nextEmail;
  }

  if (body.password !== undefined) {
    const trimmedPassword = body.password.trim();
    if (!trimmedPassword) {
      return NextResponse.json({ error: "Password cannot be empty." }, { status: 400 });
    }

    updatePayload.password_hash = await hashPassword(trimmedPassword);
  }

  if (body.role !== undefined) {
    if (!["staff", "super_admin"].includes(body.role)) {
      return NextResponse.json({ error: "Invalid role selection." }, { status: 400 });
    }

    if (existingUser.role === "super_admin" && body.role === "staff") {
      const countResult = await superAdminCount(targetId);
      if ("error" in countResult) {
        return countResult.error;
      }

      if ((countResult.count ?? 0) === 0) {
        return NextResponse.json(
          { error: "At least one super admin must remain in the system." },
          { status: 409 }
        );
      }
    }

    updatePayload.role = body.role;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { data: updatedUser, error: updateError } = await supabaseAdmin
    .from("users")
    .update(updatePayload)
    .eq("id", targetId)
    .select("id, email, role, created_at")
    .maybeSingle();

  if (updateError || !updatedUser) {
    console.error("Failed to update staff user", updateError);
    return NextResponse.json({ error: "Unable to update staff right now." }, { status: 500 });
  }

  return NextResponse.json({ user: updatedUser });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) {
    return auth.error;
  }

  const requestingUserId = auth.payload.sub as string;
  const targetId = params.id;

  if (requestingUserId === targetId) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 }
    );
  }

  const { data: existingUser, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("id", targetId)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to load user for deletion", fetchError);
    return NextResponse.json({ error: "Unable to delete staff right now." }, { status: 500 });
  }

  if (!existingUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (existingUser.role === "super_admin") {
    const countResult = await superAdminCount(targetId);
    if ("error" in countResult) {
      return countResult.error;
    }

    if ((countResult.count ?? 0) === 0) {
      return NextResponse.json(
        { error: "At least one super admin must remain in the system." },
        { status: 409 }
      );
    }
  }

  const { error: deleteError } = await supabaseAdmin.from("users").delete().eq("id", targetId);

  if (deleteError) {
    console.error("Failed to delete staff user", deleteError);
    return NextResponse.json({ error: "Unable to delete staff right now." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}