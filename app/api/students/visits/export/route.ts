import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const VISIT_SELECT_COLUMNS =
  "student_name, student_id, student_email, student_phone, student_batch, student_major, notes, is_flagged, visited_at, corporate_client_id";

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
    console.error("students/visits/export authentication failed", error);
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
}

async function resolveCorporateId(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("corporate_clients")
    .select("id, company_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to resolve corporate client", error);
    return { error: NextResponse.json({ error: "Unable to resolve corporate profile." }, { status: 500 }) };
  }

  if (!data) {
    return { error: NextResponse.json({ error: "Corporate profile not found." }, { status: 404 }) };
  }

  return { corporateId: data.id, companyName: data.company_name };
}

function toCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
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

  let targetCorporateId = corporateIdParam;
  let companyName: string | undefined;

  if (payload.role === "corporate") {
    const resolution = await resolveCorporateId(payload.sub as string);
    if ("error" in resolution) {
      return resolution.error;
    }

    companyName = resolution.companyName;

    if (targetCorporateId && targetCorporateId !== resolution.corporateId) {
      return NextResponse.json(
        { error: "You cannot export visits for another corporate client." },
        { status: 403 }
      );
    }

    targetCorporateId = resolution.corporateId;
  } else {
    if (!targetCorporateId) {
      return NextResponse.json(
        { error: "corporate_id query parameter is required." },
        { status: 400 }
      );
    }
  }

  let query = supabaseAdmin
    .from("student_visits")
    .select(VISIT_SELECT_COLUMNS)
    .eq("corporate_client_id", targetCorporateId)
    .order("visited_at", { ascending: false });

  if (flaggedParam) {
    query = query.eq("is_flagged", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to export student visits", error);
    return NextResponse.json(
      { error: "Unable to export visits right now." },
      { status: 500 }
    );
  }

  const rows = data ?? [];

  const header = [
    "Student Name",
    "Habib ID",
    "Email",
    "Phone",
    "Batch",
    "Major",
    "Notes",
    "Flagged",
    "Visited At",
  ];

  const csvLines = [header.map(toCsvValue).join(",")];

  for (const row of rows) {
    csvLines.push(
      [
        toCsvValue(row.student_name),
        toCsvValue(row.student_id),
        toCsvValue(row.student_email),
        toCsvValue(row.student_phone ?? ""),
        toCsvValue(row.student_batch ?? ""),
        toCsvValue(row.student_major ?? ""),
        toCsvValue(row.notes ?? ""),
        toCsvValue(row.is_flagged ? "Yes" : "No"),
        toCsvValue(row.visited_at),
      ].join(",")
    );
  }

  const csvContent = csvLines.join("\r\n");

  const fileLabel = flaggedParam ? "flagged" : "all";
  const normalizedCompany = (companyName ?? "career-city-client").replace(/\s+/g, "-").toLowerCase();
  const filename = `${normalizedCompany}-student-visits-${fileLabel}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
