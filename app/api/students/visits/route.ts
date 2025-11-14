import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

const VISIT_SELECT_COLUMNS =
  "id, corporate_client_id, student_name, student_id, student_email, student_phone, student_batch, student_major, notes, is_flagged, visited_at";

const MAX_PAGE_SIZE = 100;

interface VisitsResponsePayload {
  visits: unknown[];
  hasMore: boolean;
  nextOffset: number;
}

async function authenticate(request: NextRequest) {
  const cookieToken = request.cookies.get("token")?.value;
  const bearerToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const token = cookieToken ?? bearerToken ?? null;

  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    const payload = await verifyJWT(token);
    return { payload };
  } catch (error) {
    console.error("students/visits authentication failed", error);
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
}

async function resolveCorporateId(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("corporate_clients")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to resolve corporate client", error);
    return { error: NextResponse.json({ error: "Unable to resolve corporate profile." }, { status: 500 }) };
  }

  if (!data) {
    return { error: NextResponse.json({ error: "Corporate profile not found." }, { status: 404 }) };
  }

  return { corporateId: data.id };
}

export async function GET(request: NextRequest) {
  const authResult = await authenticate(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { payload } = authResult;
  const { searchParams } = new URL(request.url);
  const corporateIdParam = searchParams.get("corporate_id")?.trim() ?? undefined;
  const flaggedParam = searchParams.get("flagged")?.toLowerCase() === "true";
  const rawSearchParam =
    searchParams.get("q")?.trim() ?? searchParams.get("search")?.trim() ?? "";
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  const offsetParam = Number.parseInt(searchParams.get("offset") ?? "0", 10);

  const limit = Number.isFinite(limitParam)
    ? Math.max(1, Math.min(MAX_PAGE_SIZE, limitParam))
    : 20;
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;

  let targetCorporateId = corporateIdParam;

  if (payload.role === "corporate") {
    const resolution = await resolveCorporateId(payload.sub as string);
    if ("error" in resolution) {
      return resolution.error;
    }

    if (targetCorporateId && targetCorporateId !== resolution.corporateId) {
      return NextResponse.json(
        { error: "You cannot view visits for another corporate client." },
        { status: 403 }
      );
    }

    targetCorporateId = resolution.corporateId;
  } else if (!targetCorporateId) {
    return NextResponse.json(
      { error: "corporate_id query parameter is required." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("student_visits")
    .select(VISIT_SELECT_COLUMNS, { count: "exact" })
    .eq("corporate_client_id", targetCorporateId)
    .order("visited_at", { ascending: false });

  if (flaggedParam) {
    query = query.eq("is_flagged", true);
  }

  if (rawSearchParam) {
    const sanitized = rawSearchParam
      .replace(/[%_]/g, " ")
      .replace(/[*,;]/g, " ")
      .replace(/["']/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (sanitized) {
      const normalized = sanitized.slice(0, 120);
      const wildcard = `%${normalized.split(" ").join("%")}%`;
      query = query.or(
        [
          `student_name.ilike.${wildcard}`,
          `student_email.ilike.${wildcard}`,
          `student_id.ilike.${wildcard}`,
          `student_batch.ilike.${wildcard}`,
          `student_major.ilike.${wildcard}`,
          `student_phone.ilike.${wildcard}`,
          `notes.ilike.${wildcard}`,
        ].join(",")
      );
    }
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Failed to fetch student visits", error);
    return NextResponse.json(
      { error: "Unable to retrieve visits right now." },
      { status: 500 }
    );
  }

  const resolvedCount = count ?? data?.length ?? 0;
  const returned = data ?? [];
  const nextOffset = offset + returned.length;
  const hasMore = resolvedCount > nextOffset;

  const responsePayload: VisitsResponsePayload = {
    visits: returned,
    hasMore,
    nextOffset,
  };

  return NextResponse.json(responsePayload);
}
