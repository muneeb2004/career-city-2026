"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Download, Flag, Mail, MapPin, CalendarClock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";

export interface StaffClientDetailProps {
  role: "super_admin" | "staff";
  client: {
    id: string;
    companyName: string;
    stallNumber: string | null;
    stallIdentifier: string | null;
    stallPosition: Record<string, unknown> | null;
    floor: {
      id: string;
      name: string | null;
      mapImageUrl: string | null;
    } | null;
    contactEmail: string | null;
    createdAt: string | null;
  };
  visits: Array<{
    id: string;
    studentName: string;
    studentId: string;
    studentEmail: string;
    studentPhone: string | null;
    studentBatch: string | null;
    studentMajor: string | null;
    notes: string | null;
    isFlagged: boolean;
    visitedAt: string;
  }>;
}

const visitDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function extractFilename(headerValue: string | null, fallback: string) {
  if (!headerValue) {
    return fallback;
  }

  const match = /filename="?([^";]+)"?/i.exec(headerValue);
  return match?.[1] ?? fallback;
}

export default function ClientDetailView({ client, visits, role }: StaffClientDetailProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);
  const viewerRoleLabel = role === "super_admin" ? "Super admin view" : "Staff view";
  useEffect(() => {
    if (showMap) {
      closeButtonRef.current?.focus();
    } else {
      lastFocusedElement.current?.focus({ preventScroll: true });
    }
  }, [showMap]);

  const flaggedStudents = useMemo(() => visits.filter((visit) => visit.isFlagged), [visits]);

  const handleExport = async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch(`/api/students/visits/export?corporate_id=${client.id}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Unable to export visits.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const filename = extractFilename(response.headers.get("content-disposition"), `${client.companyName}-visits.csv`);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV export started.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected export error.";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-white via-white to-primary/10 px-6 py-10 lg:px-12">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/40 bg-white/70 p-8 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary">Client profile</p>
            <h1 className="text-3xl font-semibold text-text">{client.companyName}</h1>
            <p className="sr-only" role="status" aria-live="polite">
              {viewerRoleLabel}
            </p>
            <p className="mt-2 text-sm text-text/70">
              Stall {client.stallNumber ?? "TBD"} • {client.floor?.name ?? "Floor assignment pending"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {client.floor?.mapImageUrl && (
              <button
                type="button"
                onClick={() => {
                  lastFocusedElement.current = document.activeElement as HTMLElement;
                  setShowMap(true);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/40 hover:text-primary/80"
              >
                <MapPin className="h-4 w-4" /> View stall map
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={isExporting}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-80"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Preparing..." : "Export data"}
            </button>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-white/40 bg-white/80 px-5 py-4">
            <dt className="text-xs uppercase tracking-wide text-text/60">Account contact</dt>
            <dd className="mt-2 flex items-center gap-2 text-sm text-text/80">
              <Mail className="h-4 w-4 text-primary" />
              {client.contactEmail ?? "Not assigned"}
            </dd>
          </div>
          <div className="rounded-3xl border border-white/40 bg-white/80 px-5 py-4">
            <dt className="text-xs uppercase tracking-wide text-text/60">Created</dt>
            <dd className="mt-2 flex items-center gap-2 text-sm text-text/80">
              <CalendarClock className="h-4 w-4 text-primary" />
              {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : "Unknown"}
            </dd>
          </div>
          <div className="rounded-3xl border border-white/40 bg-white/80 px-5 py-4">
            <dt className="text-xs uppercase tracking-wide text-text/60">Total visits</dt>
            <dd className="mt-2 text-2xl font-semibold text-text">{visits.length}</dd>
          </div>
          <div className="rounded-3xl border border-white/40 bg-white/80 px-5 py-4">
            <dt className="text-xs uppercase tracking-wide text-text/60">Flagged students</dt>
            <dd className="mt-2 flex items-center gap-2 text-2xl font-semibold text-secondary">
              <Flag className="h-4 w-4" />
              {flaggedStudents.length}
            </dd>
          </div>
        </dl>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-3xl border border-white/40 bg-white/75 p-6 shadow-lg backdrop-blur">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text">Visit timeline</h2>
            <p className="text-sm text-text/60">Newest visits appear first</p>
          </div>

          {visits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/20 bg-white/60 p-8 text-center text-text/60">
              No visits have been logged for this client yet.
            </div>
          ) : (
            <ol className="relative ms-2 border-s border-primary/20 ps-6">
              {visits.map((visit) => (
                <li key={visit.id} className="relative mb-8 last:mb-0">
                  <span className="absolute -left-[33px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary bg-white">
                    <span className={`h-2.5 w-2.5 rounded-full ${visit.isFlagged ? "bg-secondary" : "bg-primary"}`} />
                  </span>
                  <div
                    className={`rounded-2xl border px-5 py-4 shadow-sm transition ${
                      visit.isFlagged
                        ? "border-secondary/40 bg-secondary/10"
                        : "border-white/40 bg-white/80"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-text">{visit.studentName}</p>
                      <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-text/60">
                        {visit.studentId}
                      </span>
                      {visit.isFlagged && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold text-secondary">
                          <Flag className="h-3 w-3" /> Flagged
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-text/70">
                      {visitDateFormatter.format(new Date(visit.visitedAt))} • {visit.studentEmail}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-text/70">
                      {visit.studentMajor && (
                        <span className="rounded-full bg-black/5 px-3 py-1">Major: {visit.studentMajor}</span>
                      )}
                      {visit.studentBatch && (
                        <span className="rounded-full bg-black/5 px-3 py-1">Batch: {visit.studentBatch}</span>
                      )}
                      {visit.studentPhone && (
                        <span className="rounded-full bg-black/5 px-3 py-1">Phone: {visit.studentPhone}</span>
                      )}
                    </div>

                    {visit.notes && (
                      <p className="mt-3 rounded-2xl bg-black/5 p-4 text-sm text-text/80">{visit.notes}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <div className="rounded-3xl border border-white/40 bg-white/75 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-text">Flagged students</h3>
            <p className="mt-1 text-sm text-text/60">
              {flaggedStudents.length > 0
                ? "These students were flagged by the corporate representative for follow-up."
                : "No flagged students yet."}
            </p>

            <ul className="mt-4 space-y-3 text-sm">
              {flaggedStudents.slice(0, 6).map((visit) => (
                <li
                  key={visit.id}
                  className="flex flex-col rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-secondary"
                >
                  <span className="font-semibold">{visit.studentName}</span>
                  <span className="text-xs uppercase tracking-wide text-secondary/80">{visit.studentId}</span>
                  {visit.notes && <span className="mt-1 text-xs text-secondary/90">{visit.notes}</span>}
                </li>
              ))}
            </ul>

            {flaggedStudents.length > 6 && (
              <p className="mt-3 text-xs text-text/60">
                Showing the first six flagged students. Export the CSV for the full list.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-white/40 bg-white/75 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-text">Stall logistics</h3>
            <dl className="mt-3 space-y-2 text-sm text-text/70">
              <div>
                <dt className="text-xs uppercase tracking-wide text-text/60">Stall identifier</dt>
                <dd className="mt-1 text-text">{client.stallIdentifier ?? "Not assigned"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-text/60">Floor</dt>
                <dd className="mt-1 text-text">{client.floor?.name ?? "TBD"}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>

      <AnimatePresence>
        {showMap && client.floor?.mapImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stall-map-heading"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setShowMap(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <h2 id="stall-map-heading" className="sr-only">
                Stall map for {client.companyName}
              </h2>
              <button
                type="button"
                ref={closeButtonRef}
                onClick={() => setShowMap(false)}
                className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                aria-label="Close map"
              >
                X
              </button>
              <div className="relative max-h-[80vh] overflow-auto">
                <div className="relative h-full w-full min-h-[320px]">
                  <Image
                    src={client.floor.mapImageUrl}
                    alt={`Floor map for ${client.companyName}`}
                    fill
                    className="object-contain"
                    sizes="(min-width: 1024px) 768px, 90vw"
                    placeholder="blur"
                    blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}