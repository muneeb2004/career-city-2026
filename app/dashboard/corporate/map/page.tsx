import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyJWT } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import CorporateMapClient from "./CorporateMapClient";
import type { FloorViewModel } from "@/app/dashboard/staff/floors/types";
import { normalizeFloorRow, type SupabaseFloorRow } from "@/lib/types/floors";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Corporate Floor Map",
  description:
    "View your assigned stall and explore the Career City 2026 floor plan tailored to corporate partners.",
  alternates: {
    canonical: "/dashboard/corporate/map",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CorporateMapPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login/corporate?redirect=/dashboard/corporate/map");
  }

  let payload;
  try {
    payload = await verifyJWT(token);
  } catch (error) {
    console.error("Corporate map token verification failed", error);
    redirect("/login/corporate?redirect=/dashboard/corporate/map");
  }

  if (payload.role !== "corporate") {
    redirect("/welcome");
  }

  const supabase = getSupabaseAdminClient();
  const {
    data: corporateClient,
    error: corporateError,
  } = await supabase
    .from("corporate_clients")
    .select("id, company_name")
    .eq("user_id", payload.sub)
    .maybeSingle();

  if (corporateError) {
    console.error("Failed to load corporate client for map", corporateError);
  }

  if (!corporateClient) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 py-16">
        <section className="max-w-xl rounded-3xl bg-white p-10 text-center shadow-2xl">
          <h1 className="text-2xl font-semibold text-text">Corporate profile incomplete</h1>
          <p className="mt-4 text-text/70">
            We could not find a corporate client record linked to your account yet. Please contact the Career City
            support team to complete your onboarding.
          </p>
        </section>
      </main>
    );
  }

  const {
    data: floorsData,
    error: floorsError,
  } = await supabase
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
    console.error("Failed to load floors for corporate map", floorsError);
  }

  const floors: FloorViewModel[] = (floorsData ?? []).map((floor) =>
    normalizeFloorRow(floor as unknown as SupabaseFloorRow)
  );

  let currentStallId: string | null = null;
  let currentStallIdentifier: string | null = null;
  let currentFloorId: string | null = null;

  for (const floor of floors) {
    for (const stall of floor.stalls) {
      if (stall.corporateClientId === corporateClient.id) {
        currentStallId = stall.id;
        currentStallIdentifier = stall.identifier;
        currentFloorId = floor.id;
        break;
      }
    }
    if (currentStallId) {
      break;
    }
  }

  return (
    <CorporateMapClient
      companyName={corporateClient.company_name}
      floors={floors}
      currentStallId={currentStallId}
      currentStallIdentifier={currentStallIdentifier}
      currentFloorId={currentFloorId}
    />
  );
}
