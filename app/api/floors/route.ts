import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import { normalizeFloorRow, type SupabaseFloorRow } from "@/lib/types/floors";

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
    console.error("floors route token verification failed", error);
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) } as const;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireStaffAccess(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { data, error } = await supabaseAdmin
    .from("floors")
    .select(
      `id, name, map_image_url, order_index, created_at,
      stalls:stalls(id, stall_identifier, position, corporate_client_id,
        corporate_client:corporate_clients(id, company_name)
      )`
    )
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load floors", error);
    return NextResponse.json({ error: "Unable to load floors" }, { status: 500 });
  }

  const floors = (data ?? []).map((row) => normalizeFloorRow(row as unknown as SupabaseFloorRow));

  return NextResponse.json({ floors });
}

export async function POST(request: NextRequest) {
  const auth = await requireStaffAccess(request);
  if ("error" in auth) {
    return auth.error;
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : null;

  if (!name) {
    return NextResponse.json({ error: "Floor name is required" }, { status: 400 });
  }

  const { data: orderRecords, error: orderError } = await supabaseAdmin
    .from("floors")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1);

  if (orderError) {
    console.error("Failed to determine floor order", orderError);
    return NextResponse.json({ error: "Unable to create floor" }, { status: 500 });
  }

  const nextOrderIndex = (orderRecords?.[0]?.order_index ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from("floors")
    .insert({ name, map_image_url: "", order_index: nextOrderIndex })
    .select(
      `id, name, map_image_url, order_index, created_at,
      stalls:stalls(id, stall_identifier, position, corporate_client_id,
        corporate_client:corporate_clients(id, company_name)
      )`
    )
    .single();

  if (error) {
    console.error("Failed to create floor", error);
    return NextResponse.json({ error: "Unable to create floor" }, { status: 500 });
  }

  return NextResponse.json(
    { floor: normalizeFloorRow(data as unknown as SupabaseFloorRow) },
    { status: 201 }
  );
}
