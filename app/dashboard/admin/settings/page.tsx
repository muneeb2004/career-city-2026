import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminSettingsClient from "./AdminSettingsClient";
import { verifyJWT } from "@/lib/auth";
import { getAdminSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login/staff?redirect=/dashboard/admin/settings");
  }

  let payload;
  try {
    payload = await verifyJWT(token);
  } catch (error) {
    console.error("Admin settings token verification failed", error);
    redirect("/login/staff?redirect=/dashboard/admin/settings");
  }

  if (!payload || payload.role !== "super_admin") {
    redirect("/welcome");
  }

  const settings = await getAdminSettings();

  return <AdminSettingsClient initialSettings={settings} />;
}
