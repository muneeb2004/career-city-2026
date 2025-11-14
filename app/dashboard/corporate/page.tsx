import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CorporateDashboardClient, {
  type CorporateClientSummary,
  type CorporateStallSummary,
  type StudentVisitUi,
} from "./CorporateDashboardClient";
import { verifyJWT } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getAdminSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const INITIAL_PAGE_SIZE = 20;

export default async function CorporateDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login/corporate?redirect=/dashboard/corporate");
  }

  let payload;
  try {
    payload = await verifyJWT(token);
  } catch (error) {
    console.error("Corporate dashboard token verification failed", error);
    redirect("/login/corporate?redirect=/dashboard/corporate");
  }

  if (payload.role !== "corporate") {
    redirect("/welcome");
  }

  const adminSettings = await getAdminSettings();
  const defaultExportScope = adminSettings.defaultExportScope;
  const defaultExportFormat = adminSettings.defaultExportFormat;
  const sessionTimeoutMinutes = adminSettings.sessionTimeoutMinutes;

  const computeWarningOffsetMinutes = (timeoutMinutes: number) => {
    if (!Number.isFinite(timeoutMinutes) || timeoutMinutes <= 6) {
      return Math.max(Math.trunc(timeoutMinutes) - 1, 1);
    }
    return Math.trunc(timeoutMinutes) - 5;
  };

  const sessionWarningOffsetMs = Math.max(
    computeWarningOffsetMinutes(sessionTimeoutMinutes),
    1
  ) * 60 * 1000;

  const supabase = getSupabaseAdminClient();
  const {
    data: corporateClient,
    error: corporateError,
  } = await supabase
    .from("corporate_clients")
    .select("id, company_name, stall_number, stall_position")
    .eq("user_id", payload.sub)
    .maybeSingle();

  if (corporateError) {
    console.error("Failed to load corporate client", corporateError);
  }

  if (!corporateClient) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 py-16">
        <section className="max-w-xl rounded-3xl bg-white p-10 text-center shadow-2xl">
          <h1 className="text-2xl font-semibold text-text">Corporate profile incomplete</h1>
          <p className="mt-4 text-text/70">
            We could not find a corporate client record linked to your account yet. Please contact the Career
            City support team to complete your onboarding.
          </p>
        </section>
      </main>
    );
  }

  const {
    data: stall,
    error: stallError,
  } = await supabase
  .from("stalls")
  .select("id, stall_identifier, position, floor:floors(id, name, map_image_url)")
    .eq("corporate_client_id", corporateClient.id)
    .maybeSingle();

  if (stallError) {
    console.error("Failed to load stall information", stallError);
  }

  let visitsQuery = supabase
    .from("student_visits")
    .select(
      "id, student_name, student_id, student_email, student_phone, student_batch, student_major, notes, is_flagged, visited_at",
      { count: "exact" }
    )
    .eq("corporate_client_id", corporateClient.id)
    .order("visited_at", { ascending: false });

  if (defaultExportScope === "flagged") {
    visitsQuery = visitsQuery.eq("is_flagged", true);
  }

  const {
    data: visits,
    error: visitsError,
    count: visitsCount,
  } = await visitsQuery.range(0, INITIAL_PAGE_SIZE - 1);

  if (visitsError) {
    console.error("Failed to load student visits", visitsError);
  }

  const corporateSummary: CorporateClientSummary = {
    id: corporateClient.id,
    companyName: corporateClient.company_name,
    stallNumber: corporateClient.stall_number,
    stallPosition: corporateClient.stall_position,
  };

  const floorRecord = stall?.floor
    ? Array.isArray(stall.floor)
      ? stall.floor[0]
      : stall.floor
    : null;

  const stallSummary: CorporateStallSummary | null = stall
    ? {
        id: stall.id,
        identifier: stall.stall_identifier,
        position: stall.position,
        floor: floorRecord
          ? {
              id: floorRecord.id,
              name: floorRecord.name,
              mapImageUrl: floorRecord.map_image_url,
            }
          : null,
      }
    : null;

  const visitSummaries: StudentVisitUi[] = (visits ?? []).map((visit) => ({
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
  }));

  const initialHasMore = (visitsCount ?? visitSummaries.length) > visitSummaries.length;
  const initialNextOffset = visitSummaries.length;

  return (
    <CorporateDashboardClient
      corporateClient={corporateSummary}
      stall={stallSummary}
      initialVisits={visitSummaries}
      pageSize={INITIAL_PAGE_SIZE}
      initialHasMore={initialHasMore}
      initialNextOffset={initialNextOffset}
      sessionExpiresAt={(payload.exp as number | undefined) ?? null}
  exportDefaults={{ scope: defaultExportScope, format: defaultExportFormat }}
      sessionTimeoutWarningOffsetMs={sessionWarningOffsetMs}
    />
  );
}
