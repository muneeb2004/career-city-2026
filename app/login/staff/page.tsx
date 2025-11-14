import { getSupabaseAdminClient } from "@/lib/supabase";
import { StaffAuthShell } from "@/app/login/staff/shell";
import StaffLoginPanel from "@/app/login/staff/StaffLoginPanel";
import SuperAdminSetupPanel from "@/app/login/staff/SuperAdminSetupPanel";

export const dynamic = "force-dynamic";

interface StaffLoginPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function StaffLoginPage({
  searchParams,
}: StaffLoginPageProps) {
  const redirectParam =
    (typeof searchParams?.redirect === "string" && searchParams.redirect) || "/dashboard/staff";

  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("Failed to determine user count", error);
  }

  const hasUsers = (count ?? 0) > 0;

  return (
    <StaffAuthShell>
      {hasUsers ? (
        <StaffLoginPanel redirectPath={redirectParam} />
      ) : (
        <SuperAdminSetupPanel redirectPath={redirectParam} />
      )}
    </StaffAuthShell>
  );
}
