import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import FloorsDashboardClient, {
  type FloorsDashboardClientProps,
} from "@/app/dashboard/staff/floors/FloorsDashboardClient";
import {
  normalizeFloorRow,
  type SupabaseCorporateClientRow,
  type SupabaseFloorRow,
} from "@/lib/types/floors";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Floor Management",
  description: "Manage floor plans, stalls, and corporate assignments across Career City 2026.",
  alternates: {
    canonical: "/dashboard/staff/floors",
  },
  robots: {
    index: false,
    follow: false,
  },
};

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

  const supabase = getSupabaseAdminClient();
  const { data: floorRecords, error: floorsError } = await supabase
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

  const { data: corporateClients, error: clientsError } = await supabase
    .from("corporate_clients")
    .select("id, company_name")
    .order("company_name", { ascending: true });

  if (clientsError) {
    console.error("Failed to load corporate clients for floors dashboard", clientsError);
  }

  const floors: FloorsDashboardClientProps["floors"] = (floorRecords ?? []).map((floor) =>
    normalizeFloorRow(floor as unknown as SupabaseFloorRow)
  );

  const clients: FloorsDashboardClientProps["clients"] = (corporateClients ?? []).map((client) => {
    const row = client as SupabaseCorporateClientRow;
    return {
      id: row.id,
      companyName: row.company_name ?? "",
    };
  });

  return <FloorsDashboardClient role={staffRole} floors={floors} clients={clients} />;
}
