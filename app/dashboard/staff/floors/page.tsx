import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import FloorsDashboardClient, {
  type FloorsDashboardClientProps,
} from "@/app/dashboard/staff/floors/FloorsDashboardClient";

export const dynamic = "force-dynamic";

export default async function FloorsDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login/staff?redirect=/dashboard/staff/floors");
  }

  let payload;
  try {
    payload = await verifyJWT(token);
  } catch (error) {
    console.error("Floors dashboard token verification failed", error);
    redirect("/login/staff?redirect=/dashboard/staff/floors");
  }

  if (!payload || !["super_admin", "staff"].includes(payload.role)) {
    redirect("/welcome");
  }

  const staffRole = payload.role as "super_admin" | "staff";

  const { data: floorRecords, error: floorsError } = await supabaseAdmin
    .from("floors")
    .select(
      `id, name, map_image_url, order_index, created_at,
      stalls:stalls(id, stall_identifier, position, corporate_client_id,
        corporate_client:corporate_clients(id, company_name)
      )`
    )
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (floorsError) {
    console.error("Failed to load floor records", floorsError);
  }

  const { data: corporateClients, error: clientsError } = await supabaseAdmin
    .from("corporate_clients")
    .select("id, company_name")
    .order("company_name", { ascending: true });

  if (clientsError) {
    console.error("Failed to load corporate clients for floors dashboard", clientsError);
  }

  const floors: FloorsDashboardClientProps["floors"] = (floorRecords ?? []).map((floor: any) => ({
    id: floor.id,
    name: floor.name,
    mapImageUrl: floor.map_image_url ?? "",
    orderIndex: floor.order_index ?? 0,
    createdAt: floor.created_at,
  stalls: (floor.stalls ?? []).map((stall: any) => ({
      id: stall.id,
      identifier: stall.stall_identifier,
      x: Number(stall.position?.x ?? 0),
      y: Number(stall.position?.y ?? 0),
      corporateClientId: stall.corporate_client_id ?? null,
      corporateClientName: stall.corporate_client?.company_name ?? null,
    })),
  }));

  const clients: FloorsDashboardClientProps["clients"] = (corporateClients ?? []).map((client: any) => ({
    id: client.id,
    companyName: client.company_name,
  }));

  return <FloorsDashboardClient role={staffRole} floors={floors} clients={clients} />;
}
