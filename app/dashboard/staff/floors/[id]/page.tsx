import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import FloorEditorClient, {
  type FloorEditorClientProps,
} from "@/app/dashboard/staff/floors/FloorEditorClient";

export const dynamic = "force-dynamic";

interface FloorDetailPageProps {
  params: Promise<{ id: string }>;
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

  const floor: FloorEditorClientProps["floor"] = {
    id: floorRecord.id,
    name: floorRecord.name,
    mapImageUrl: floorRecord.map_image_url ?? "",
    orderIndex: floorRecord.order_index ?? 0,
    createdAt: floorRecord.created_at,
    stalls: (floorRecord.stalls ?? []).map((stall: any) => ({
      id: stall.id,
      identifier: stall.stall_identifier,
      x: Number(stall.position?.x ?? 0),
      y: Number(stall.position?.y ?? 0),
      corporateClientId: stall.corporate_client_id ?? null,
      corporateClientName: stall.corporate_client?.company_name ?? null,
    })),
  };

  const clients: FloorEditorClientProps["clients"] = (corporateClients ?? []).map((client: any) => ({
    id: client.id,
    companyName: client.company_name,
  }));

  return <FloorEditorClient role={staffRole} floor={floor} clients={clients} />;
}
