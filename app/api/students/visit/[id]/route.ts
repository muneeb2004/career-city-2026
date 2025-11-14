import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

const VISIT_SELECT_COLUMNS =
  "id, corporate_client_id, student_name, student_id, student_email, student_phone, student_batch, student_major, notes, is_flagged, visited_at";

const ALLOWED_MAJORS = new Set([
  "Computer Science",
  "Computer Engineering",
  "Electrical Engineering",
  "Communication and Design",
  "Social, Development and Policy",
  "Comparative Humanities",
]);

const STUDENT_ID_REGEX = /^[A-Za-z]{2}\d{5}$/;
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

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
    console.error("students/visit/[id] authentication failed", error);
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

async function assertOwnership(visitId: string, userRole: string, userId: string) {
  const supabase2 = getSupabaseAdminClient();
  const { data: visitRecord, error } = await supabase2
    .from("student_visits")
    .select("id, corporate_client_id")
    .eq("id", visitId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch visit for ownership check", error);
    return { error: NextResponse.json({ error: "Unable to verify visit ownership." }, { status: 500 }) };
  }

  if (!visitRecord) {
    return { error: NextResponse.json({ error: "Visit not found." }, { status: 404 }) };
  }

  if (userRole === "corporate") {
    const resolution = await resolveCorporateId(userId);
    if ("error" in resolution) {
      return resolution;
    }

    if (visitRecord.corporate_client_id !== resolution.corporateId) {
      return { error: NextResponse.json({ error: "You do not have permission to modify this visit." }, { status: 403 }) };
    }
  }

  return { visit: visitRecord };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Visit id is required." }, { status: 400 });
  }

  const authResult = await authenticate(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { payload } = authResult;
  const ownership = await assertOwnership(id, payload.role, payload.sub as string);
  if ("error" in ownership) {
    return ownership.error;
  }

  const updates = (await request.json().catch(() => null)) as Partial<{
    student_name: string;
    student_id: string;
    student_email: string;
    student_phone: string | null;
    student_batch: string | null;
    student_major: string | null;
    notes: string | null;
    is_flagged: boolean;
  }> | null;

  if (!updates) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const studentName = updates.student_name?.trim();
  const studentId = updates.student_id?.trim();
  const studentEmail = updates.student_email?.trim();
  const studentBatch = updates.student_batch?.toString().trim() ?? "";
  const studentMajor = updates.student_major?.toString().trim() ?? "";

  if (!studentName || !studentId || !studentEmail || !studentBatch || !studentMajor) {
    return NextResponse.json(
      { error: "Student name, Habib ID, email, batch, and major are required." },
      { status: 400 }
    );
  }

  if (!STUDENT_ID_REGEX.test(studentId)) {
    return NextResponse.json(
      { error: "Student ID must follow the format LL##### (e.g. CS12345)." },
      { status: 400 }
    );
  }

  if (!EMAIL_REGEX.test(studentEmail)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  if (!ALLOWED_MAJORS.has(studentMajor)) {
    return NextResponse.json(
      { error: "Select a valid major option." },
      { status: 400 }
    );
  }

  const payloadToApply = {
    student_name: studentName,
    student_id: studentId.toUpperCase(),
    student_email: studentEmail,
    student_phone: updates.student_phone?.toString().trim() || null,
    student_batch: studentBatch,
    student_major: studentMajor,
    notes: updates.notes?.toString().trim() || null,
    is_flagged: Boolean(updates.is_flagged),
  };

  const supabase3 = getSupabaseAdminClient();
  const { data, error } = await supabase3
    .from("student_visits")
    .update(payloadToApply)
    .eq("id", id)
    .select(VISIT_SELECT_COLUMNS)
    .maybeSingle();

  if (error || !data) {
    console.error("Failed to update student visit", error);
    return NextResponse.json(
      { error: "Unable to update the student visit right now." },
      { status: 500 }
    );
  }

  return NextResponse.json({ visit: data });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Visit id is required." }, { status: 400 });
  }

  const authResult = await authenticate(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { payload } = authResult;
  const ownership = await assertOwnership(id, payload.role, payload.sub as string);
  if ("error" in ownership) {
    return ownership.error;
  }

  const supabase4 = getSupabaseAdminClient();
  const { error } = await supabase4.from("student_visits").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete student visit", error);
    return NextResponse.json(
      { error: "Unable to delete the student visit right now." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
