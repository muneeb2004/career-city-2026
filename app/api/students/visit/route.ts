import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

interface StudentVisitPayload {
  corporate_client_id?: string;
  student_name?: string;
  student_id?: string;
  student_email?: string;
  student_phone?: string | null;
  student_batch?: string | null;
  student_major?: string | null;
  notes?: string | null;
  is_flagged?: boolean;
}

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
    console.error("students/visit authentication failed", error);
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
}

async function resolveCorporateId(userId: string) {
  const { data, error } = await supabaseAdmin
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

export async function POST(request: NextRequest) {
  const authResult = await authenticate(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { payload } = authResult;
  const body = (await request.json().catch(() => null)) as StudentVisitPayload | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const studentName = body.student_name?.trim();
  const studentId = body.student_id?.trim();
  const studentEmail = body.student_email?.trim();
  const studentBatch = body.student_batch?.toString().trim() ?? "";
  const studentMajor = body.student_major?.toString().trim() ?? "";

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

  const cleanedPhone = body.student_phone?.toString().trim() ?? null;
  const cleanedNotes = body.notes?.toString().trim() ?? null;
  const isFlagged = Boolean(body.is_flagged);
  const normalizedStudentId = studentId.toUpperCase();

  let targetCorporateId = body.corporate_client_id?.trim();

  if (payload.role === "corporate") {
    const resolution = await resolveCorporateId(payload.sub as string);
    if ("error" in resolution) {
      return resolution.error;
    }

    if (targetCorporateId && targetCorporateId !== resolution.corporateId) {
      return NextResponse.json(
        { error: "You are not allowed to log visits for another corporate client." },
        { status: 403 }
      );
    }

    targetCorporateId = resolution.corporateId;
  } else {
    if (!targetCorporateId) {
      return NextResponse.json(
        { error: "corporate_client_id is required for staff and admin submissions." },
        { status: 400 }
      );
    }
  }

  const { data: insertResult, error: insertError } = await supabaseAdmin
    .from("student_visits")
    .insert({
      corporate_client_id: targetCorporateId,
      student_name: studentName,
  student_id: normalizedStudentId,
      student_email: studentEmail,
      student_phone: cleanedPhone,
      student_batch: studentBatch,
      student_major: studentMajor,
      notes: cleanedNotes,
      is_flagged: isFlagged,
    })
    .select(VISIT_SELECT_COLUMNS)
    .maybeSingle();

  if (insertError || !insertResult) {
    console.error("Failed to insert student visit", insertError);
    return NextResponse.json(
      { error: "Unable to save the student visit right now." },
      { status: 500 }
    );
  }

  return NextResponse.json({ visit: insertResult }, { status: 201 });
}
