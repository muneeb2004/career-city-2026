import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import StaffManagementClient, {
  type StaffManagementProps,
} from "@/app/dashboard/staff/staff-management/StaffManagementClient";

export const dynamic = "force-dynamic";

export default async function StaffManagementPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login/staff?redirect=/dashboard/staff/staff-management");
  }

  let payload;
  try {
    payload = await verifyJWT(token);
  } catch (error) {
    console.error("Staff management token verification failed", error);
    redirect("/login/staff?redirect=/dashboard/staff/staff-management");
  }

  if (payload.role !== "super_admin") {
    redirect("/dashboard/staff");
  }

  const { data: staffMembers, error } = await supabaseAdmin
    .from("users")
    .select("id, email, role, created_at")
    .in("role", ["super_admin", "staff"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load staff members", error);
  }

  const props: StaffManagementProps = {
    currentUserId: payload.sub as string,
    staff: (staffMembers ?? []).map((member) => ({
      id: member.id,
      email: member.email,
      role: member.role,
      createdAt: member.created_at,
    })),
  };

  return <StaffManagementClient {...props} />;
}