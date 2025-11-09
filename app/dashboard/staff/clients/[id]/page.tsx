import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import ClientDetailView, {
  type StaffClientDetailProps,
} from "@/app/dashboard/staff/clients/[id]/ClientDetailView";

export const dynamic = "force-dynamic";

interface StaffClientDetailPageProps {
  params: { id: string };
}

export default async function StaffClientDetailPage({ params }: StaffClientDetailPageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect(`/login/staff?redirect=/dashboard/staff/clients/${params.id}`);
  }

  let payload;
  try {
    payload = await verifyJWT(token);
  } catch (error) {
    console.error("Staff client detail token verification failed", error);
    redirect(`/login/staff?redirect=/dashboard/staff/clients/${params.id}`);
  }

  if (!["super_admin", "staff"].includes(payload.role)) {
    redirect("/welcome");
  }

  const staffRole = payload.role as "super_admin" | "staff";

  const corporateId = params.id;

  const {
    data: corporateClient,
    error: clientError,
  } = await supabaseAdmin
    .from("corporate_clients")
    .select("id, company_name, stall_number, stall_position, user_id, created_at")
    .eq("id", corporateId)
    .maybeSingle();

  if (clientError) {
    console.error("Failed to load corporate client", clientError);
  }

  if (!corporateClient) {
    notFound();
  }

  const [{ data: contactUser }, { data: stallRecord }, { data: visits }] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("id", corporateClient.user_id)
      .maybeSingle(),
    supabaseAdmin
      .from("stalls")
      .select("id, stall_identifier, position, floor:floors(id, name, map_image_url)")
      .eq("corporate_client_id", corporateClient.id)
      .maybeSingle(),
    supabaseAdmin
      .from("student_visits")
      .select(
        "id, student_name, student_id, student_email, student_phone, student_batch, student_major, notes, is_flagged, visited_at"
      )
      .eq("corporate_client_id", corporateClient.id)
      .order("visited_at", { ascending: false }),
  ]);

  const visitEntries = (visits ?? []).map((visit) => ({
    id: visit.id,
    studentName: visit.student_name,
    studentId: visit.student_id,
    studentEmail: visit.student_email,
    studentPhone: visit.student_phone,
    studentBatch: visit.student_batch,
    studentMajor: visit.student_major,
    notes: visit.notes,
    isFlagged: visit.is_flagged,
    visitedAt: visit.visited_at,
  } satisfies StaffClientDetailProps["visits"][number]));

  const stallFloorRecord = stallRecord?.floor
    ? Array.isArray(stallRecord.floor)
      ? stallRecord.floor[0]
      : stallRecord.floor
    : null;

  const client: StaffClientDetailProps["client"] = {
    id: corporateClient.id,
    companyName: corporateClient.company_name,
    stallNumber: corporateClient.stall_number,
    stallIdentifier: stallRecord?.stall_identifier ?? null,
    stallPosition: stallRecord?.position ?? null,
    floor: stallFloorRecord
      ? {
          id: stallFloorRecord.id,
          name: stallFloorRecord.name,
          mapImageUrl: stallFloorRecord.map_image_url,
        }
      : null,
    contactEmail: contactUser?.email ?? null,
    createdAt: corporateClient.created_at,
  };

  return <ClientDetailView client={client} visits={visitEntries} role={staffRole} />;
}