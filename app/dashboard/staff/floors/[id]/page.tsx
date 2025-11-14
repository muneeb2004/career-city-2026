import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import FloorEditorClient, {
  type FloorEditorClientProps,
} from "@/app/dashboard/staff/floors/FloorEditorClient";
import {
  normalizeFloorRow,
  type SupabaseCorporateClientRow,
  type SupabaseFloorRow,
} from "@/lib/types/floors";

export const dynamic = "force-dynamic";

interface FloorDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: FloorDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Floor Detail",
    description: "Edit stall placements and assignments for a specific floor within Career City 2026.",
    alternates: {
      canonical: `/dashboard/staff/floors/${id}`,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function FloorDetailPage({ params }: FloorDetailPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect(`/login/staff?redirect=/dashboard/staff/floors/${id}`);
  }

  let payload;
  try {
    payload = await verifyJWT(token);
  } catch (error) {
    console.error("Floor detail token verification failed", error);
    redirect(`/login/staff?redirect=/dashboard/staff/floors/${id}`);
  }

  if (!payload || !["super_admin", "staff"].includes(payload.role)) {
    redirect("/welcome");
  }

  const staffRole = payload.role as "super_admin" | "staff";

  const { data: floorRecord, error: floorError } = await supabaseAdmin
    .from("floors")
    .select(
      `id, name, map_image_url, order_index, created_at,
      stalls:stalls(id, stall_identifier, position, corporate_client_id,
        corporate_client:corporate_clients(id, company_name)
      )`
    )
    .eq("id", id)
    .maybeSingle();

  if (floorError) {
    console.error("Failed to load floor", floorError);
  }

  if (!floorRecord) {
    notFound();
  }

  const { data: corporateClients, error: clientsError } = await supabaseAdmin
    .from("corporate_clients")
    .select("id, company_name")
    .order("company_name", { ascending: true });

  if (clientsError) {
    console.error("Failed to load corporate clients for floor detail", clientsError);
  }

  const floor = normalizeFloorRow(floorRecord as unknown as SupabaseFloorRow);

  const clients: FloorEditorClientProps["clients"] = (corporateClients ?? []).map((client) => {
    const row = client as SupabaseCorporateClientRow;
    return {
      id: row.id,
      companyName: row.company_name ?? "",
    };
  });

  return <FloorEditorClient role={staffRole} floor={floor} clients={clients} />;
}
