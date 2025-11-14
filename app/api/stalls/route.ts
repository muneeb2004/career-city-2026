import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import { normalizeStallRow, type SupabaseStallRow } from "@/lib/types/floors";

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
    console.error("stalls route token verification failed", error);
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) } as const;
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaffAccess(request);
  if ("error" in auth) {
    return auth.error;
  }

  const body = await request.json().catch(() => null);
  const floorId = typeof body?.floorId === "string" ? body.floorId : null;
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : null;
  const x = typeof body?.x === "number" ? body.x : null;
  const y = typeof body?.y === "number" ? body.y : null;
  const corporateClientId =
    typeof body?.corporateClientId === "string" ? body.corporateClientId : null;

  if (!floorId || !identifier || !Number.isFinite(x) || !Number.isFinite(y)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stalls")
    .insert({
      floor_id: floorId,
      stall_identifier: identifier,
      position: { x, y },
      corporate_client_id: corporateClientId,
    })
    .select(
      `id, floor_id, stall_identifier, position, corporate_client_id,
      corporate_client:corporate_clients(id, company_name)`
    )
    .single();

  if (error) {
    console.error("Failed to create stall", error);
    return NextResponse.json({ error: "Unable to create stall" }, { status: 500 });
  }

  return NextResponse.json(
    { stall: normalizeStallRow(data as unknown as SupabaseStallRow) },
    { status: 201 }
  );
}
