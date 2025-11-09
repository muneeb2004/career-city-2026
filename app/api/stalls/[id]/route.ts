import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";

async function requireStaffAccess(request: NextRequest) {
  const cookieToken = request.cookies.get("token")?.value;
  const bearerToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const token = cookieToken ?? bearerToken ?? null;

  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  try {
    const payload = await verifyJWT(token);
    if (!["super_admin", "staff"].includes(payload.role)) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
    }
    return { payload } as const;
  } catch (error) {
    console.error("stall detail token verification failed", error);
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) } as const;
  }
}

function mapStallRecord(record: any) {
  return {
    id: record.id,
    identifier: record.stall_identifier,
    x: Number(record.position?.x ?? 0),
    y: Number(record.position?.y ?? 0),
    corporateClientId: record.corporate_client_id ?? null,
    corporateClientName: record.corporate_client?.company_name ?? null,
    floorId: record.floor_id,
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffAccess(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const updates: Record<string, unknown> = {};

  if (typeof body?.identifier === "string" && body.identifier.trim()) {
    updates.stall_identifier = body.identifier.trim();
  }

  const hasX = typeof body?.x === "number" && Number.isFinite(body.x);
  const hasY = typeof body?.y === "number" && Number.isFinite(body.y);

  if (hasX && hasY) {
    updates.position = { x: body.x, y: body.y };
  }

  if (body?.corporateClientId === null) {
    updates.corporate_client_id = null;
  } else if (typeof body?.corporateClientId === "string") {
    updates.corporate_client_id = body.corporateClientId;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("stalls")
    .update(updates)
    .eq("id", id)
    .select(
      `id, floor_id, stall_identifier, position, corporate_client_id,
      corporate_client:corporate_clients(id, company_name)`
    )
    .single();

  if (error) {
    console.error("Failed to update stall", error);
    return NextResponse.json({ error: "Unable to update stall" }, { status: 500 });
  }

  return NextResponse.json({ stall: mapStallRecord(data) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffAccess(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await params;

  const { error } = await supabaseAdmin.from("stalls").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete stall", error);
    return NextResponse.json({ error: "Unable to delete stall" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
