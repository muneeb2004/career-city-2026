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
    console.error("floor detail token verification failed", error);
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) } as const;
  }
}

function mapFloorRecord(record: any) {
  return {
    id: record.id,
    name: record.name,
    mapImageUrl: record.map_image_url ?? "",
    orderIndex: record.order_index ?? 0,
    createdAt: record.created_at,
    stalls: (record.stalls ?? []).map((stall: any) => ({
      id: stall.id,
      identifier: stall.stall_identifier,
      x: Number(stall.position?.x ?? 0),
      y: Number(stall.position?.y ?? 0),
      corporateClientId: stall.corporate_client_id ?? null,
      corporateClientName: stall.corporate_client?.company_name ?? null,
    })),
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

  if (typeof body?.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }

  if (typeof body?.mapImageUrl === "string") {
    updates.map_image_url = body.mapImageUrl;
  }

  if (typeof body?.orderIndex === "number" && Number.isFinite(body.orderIndex)) {
    updates.order_index = body.orderIndex;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("floors")
    .update(updates)
    .eq("id", id)
    .select(
      `id, name, map_image_url, order_index, created_at,
      stalls:stalls(id, stall_identifier, position, corporate_client_id,
        corporate_client:corporate_clients(id, company_name)
      )`
    )
    .single();

  if (error) {
    console.error("Failed to update floor", error);
    return NextResponse.json({ error: "Unable to update floor" }, { status: 500 });
  }

  return NextResponse.json({ floor: mapFloorRecord(data) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffAccess(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await params;

  const { error } = await supabaseAdmin.from("floors").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete floor", error);
    return NextResponse.json({ error: "Unable to delete floor" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
