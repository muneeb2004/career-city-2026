"use client";

import Link from "next/link";
import { useMemo, type ComponentType } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronRight,
  LayoutDashboard,
  Map as MapIcon,
  Users2,
  Mail,
  Building2,
  ShieldCheck,
} from "lucide-react";

export interface StaffDashboardClientProps {
  role: "super_admin" | "staff";
  clients: Array<{
    id: string;
    companyName: string;
    stallNumber: string | null;
    contactEmail: string | null;
    totalVisits: number;
    flaggedVisits: number;
    createdAt: string | null;
  }>;
  overview: {
    totalClients: number;
    totalVisits: number;
    flaggedStudents: number;
  };
}

interface NavigationItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  requiresSuperAdmin?: boolean;
}

const navItems: NavigationItem[] = [
  {
    label: "Dashboard overview",
    icon: LayoutDashboard,
    href: "/dashboard/staff",
  },
  {
    label: "Client management",
    icon: BriefcaseBusiness,
    href: "/dashboard/staff",
  },
  {
    label: "Staff management",
    icon: Users2,
    href: "/dashboard/staff/staff-management",
    requiresSuperAdmin: true,
  },
  {
    label: "Admin settings",
    icon: ShieldCheck,
    href: "/dashboard/admin/settings",
    requiresSuperAdmin: true,
  },
  {
    label: "Floor & stall management",
    icon: MapIcon,
    href: "/dashboard/staff/floors",
  },
  {
    label: "Reports",
    icon: BarChart3,
  },
];

const statCardClasses =
  "rounded-3xl border border-white/30 bg-white/40 px-6 py-5 shadow-lg backdrop-blur-md";

export default function StaffDashboardClient({ role, clients, overview }: StaffDashboardClientProps) {
  const availableNavItems = useMemo(
    () =>
      navItems.filter((item) => (item.requiresSuperAdmin ? role === "super_admin" : true)),
    [role]
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-white via-white to-primary/5">
      <aside className="hidden w-72 flex-col border-r border-primary/10 bg-white/70 p-8 backdrop-blur-xl lg:flex">
        <div className="mb-10 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-text/60">Career City</p>
            <h1 className="text-lg font-semibold text-text">Staff Console</h1>
            <p className="text-xs text-text/60">{role.replace("_", " ")}</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          {availableNavItems.map(({ label, icon: Icon, href }) => {
            if (href) {
              return (
                <Link
                  key={label}
                  href={href}
                  className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-text/70 transition hover:bg-primary/10 hover:text-primary"
                >
                  <Icon className="h-4 w-4 transition group-hover:text-primary" />
                  <span>{label}</span>
                </Link>
              );
            }

            return (
              <span
                key={label}
                className="flex cursor-not-allowed items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-text/40"
              >
                <Icon className="h-4 w-4" />
                <span>{label} (coming soon)</span>
              </span>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 px-6 py-10 lg:px-12">
        <header className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">Career City Operations</p>
            <h2 className="mt-1 text-3xl font-semibold text-text">Staff Dashboard</h2>
            <p className="mt-2 max-w-2xl text-sm text-text/70">
              Monitor corporate partners, track student engagement trends, and coordinate resources across the career fair.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className={statCardClasses}>
            <p className="text-xs uppercase tracking-wide text-text/60">Total corporate partners</p>
            <p className="mt-3 text-3xl font-semibold text-text">{overview.totalClients}</p>
          </div>
          <div className={statCardClasses}>
            <p className="text-xs uppercase tracking-wide text-text/60">Student visits logged</p>
            <p className="mt-3 text-3xl font-semibold text-text">{overview.totalVisits}</p>
          </div>
          <div className={statCardClasses}>
            <p className="text-xs uppercase tracking-wide text-text/60">Flagged students</p>
            <p className="mt-3 text-3xl font-semibold text-text">{overview.flaggedStudents}</p>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-text">Client directory</h3>
              <p className="text-sm text-text/70">
                Review performance snapshots for each corporate stall and jump into deeper visit history when needed.
              </p>
            </div>
          </div>

          {clients.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-primary/30 bg-white/60 p-10 text-center text-text/60">
              No corporate clients are connected yet. Invite partners to Career City to populate this dashboard.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {clients.map((client) => {
                const isFlaggedHeavy = client.flaggedVisits > 0;

                return (
                  <Link
                    key={client.id}
                    href={`/dashboard/staff/clients/${client.id}`}
                    className="group rounded-3xl border border-white/40 bg-white/70 p-6 shadow-lg transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-text">{client.companyName}</h4>
                        <p className="mt-1 text-sm text-text/60">
                          Stall {client.stallNumber ?? "TBD"}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-primary/60 transition group-hover:translate-x-1 group-hover:text-primary" />
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-text/70">
                      {client.contactEmail && (
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-primary" />
                          {client.contactEmail}
                        </p>
                      )}
                      <p>
                        <span className="font-semibold text-text">{client.totalVisits}</span> total visits
                      </p>
                      <p className={isFlaggedHeavy ? "font-semibold text-secondary" : ""}>
                        {client.flaggedVisits} flagged students
                      </p>
                    </div>

                    <p className="mt-5 text-xs uppercase tracking-wide text-text/50">
                      Created: {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : "Unknown"}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}