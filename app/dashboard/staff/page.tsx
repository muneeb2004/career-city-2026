import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import StaffDashboardClient, {
  type StaffDashboardClientProps,
} from "@/app/dashboard/staff/StaffDashboardClient";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login/staff?redirect=/dashboard/staff");
  }

  let payload;
  try {
    payload = await verifyJWT(token);
  } catch (error) {
    console.error("Staff dashboard token verification failed", error);
    redirect("/login/staff?redirect=/dashboard/staff");
  }

  if (!payload || !["super_admin", "staff"].includes(payload.role)) {
    redirect("/welcome");
  }

  const staffRole = payload.role as "super_admin" | "staff";

  const { data: corporateClients, error: clientsError } = await supabaseAdmin
    .from("corporate_clients")
    .select("id, company_name, stall_number, user_id, created_at")
    .order("company_name", { ascending: true });

  if (clientsError) {
    console.error("Failed to load corporate clients", clientsError);
  }

  const clients = corporateClients ?? [];
  const userIds = Array.from(new Set(clients.map((client) => client.user_id).filter(Boolean)));
  const clientIds = clients.map((client) => client.id);

  const [{ data: userRecords, error: usersError }, { data: visitRecords, error: visitsError }] =
    await Promise.all([
      userIds.length
        ? supabaseAdmin.from("users").select("id, email").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; email: string }[], error: null }),
      clientIds.length
        ? supabaseAdmin
            .from("student_visits")
            .select("corporate_client_id, is_flagged")
            .in("corporate_client_id", clientIds)
        : Promise.resolve({ data: [] as { corporate_client_id: string; is_flagged: boolean }[], error: null }),
    ]);

  if (usersError) {
    console.error("Failed to load staff contact information", usersError);
  }

  if (visitsError) {
    console.error("Failed to load visit stats", visitsError);
  }

  const contactByUserId = new Map((userRecords ?? []).map((user) => [user.id, user.email] as const));
  const visitStats = new Map<string, { total: number; flagged: number }>();

  for (const visit of visitRecords ?? []) {
    const stat = visitStats.get(visit.corporate_client_id) ?? { total: 0, flagged: 0 };
    stat.total += 1;
    if (visit.is_flagged) {
      stat.flagged += 1;
    }
    visitStats.set(visit.corporate_client_id, stat);
  }

  const dashboardClients: StaffDashboardClientProps["clients"] = clients.map((client) => {
    const stats = visitStats.get(client.id) ?? { total: 0, flagged: 0 };
    return {
      id: client.id,
      companyName: client.company_name,
      stallNumber: client.stall_number,
      contactEmail: contactByUserId.get(client.user_id) ?? null,
      totalVisits: stats.total,
      flaggedVisits: stats.flagged,
      createdAt: client.created_at,
    };
  });

  const overview = {
    totalClients: dashboardClients.length,
    totalVisits: dashboardClients.reduce(
      (sum: number, entry: StaffDashboardClientProps["clients"][number]) => sum + entry.totalVisits,
      0
    ),
    flaggedStudents: dashboardClients.reduce(
      (sum: number, entry: StaffDashboardClientProps["clients"][number]) => sum + entry.flaggedVisits,
      0
    ),
  } satisfies StaffDashboardClientProps["overview"];

  return (
    <StaffDashboardClient
  role={staffRole}
      clients={dashboardClients}
      overview={overview}
    />
  );
}