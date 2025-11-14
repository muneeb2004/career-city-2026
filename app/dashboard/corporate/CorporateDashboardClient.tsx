"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  Download,
  Flag,
  FlagOff,
  Loader2,
  MapPinned,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { useLogout } from "@/hooks/useLogout";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { extractErrorMessage, fetchJson } from "@/lib/client/api";
import type { ExportFormat, ExportScope } from "@/lib/types/settings";

export interface CorporateClientSummary {
  id: string;
  companyName: string;
  stallNumber: string | null;
  stallPosition: string | null;
}

export interface CorporateStallSummary {
  id: string;
  identifier: string | null;
  position: string | null;
  floor: {
    id: string;
    name: string | null;
    mapImageUrl: string | null;
  } | null;
}

export interface StudentVisitUi {
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
}

interface CorporateDashboardClientProps {
  corporateClient: CorporateClientSummary;
  stall: CorporateStallSummary | null;
  initialVisits: StudentVisitUi[];
  pageSize: number;
  initialHasMore: boolean;
  initialNextOffset: number;
  sessionExpiresAt: number | null;
  exportDefaults: {
    scope: ExportScope;
    format: ExportFormat;
  };
  sessionTimeoutWarningOffsetMs: number;
}

interface VisitsQueryResult {
  visits: StudentVisitUi[];
  hasMore: boolean;
  nextOffset: number;
}

interface VisitApiPayload {
  id: string;
  student_name: string;
  student_id: string;
  student_email: string;
  student_phone: string | null;
  student_batch: string | null;
  student_major: string | null;
  notes: string | null;
  is_flagged: boolean;
  visited_at: string;
}

const MAJOR_OPTIONS = [
  "Computer Science",
  "Computer Engineering",
  "Electrical Engineering",
  "Communication and Design",
  "Social, Development and Policy",
  "Comparative Humanities",
];

const inputFieldClasses =
  "rounded-3xl border border-white/30 bg-white/20 px-4 py-3 text-base text-text shadow-lg backdrop-blur-md transition hover:bg-white/30 focus:border-primary focus:bg-white/40 focus:text-text focus:outline-none focus:ring-2 focus:ring-primary/40";

const visitDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatVisitDate(value: string) {
  try {
    return visitDateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function mapVisitFromApi(payload: VisitApiPayload): StudentVisitUi {
  return {
    id: payload.id,
    studentName: payload.student_name,
    studentId: payload.student_id,
    studentEmail: payload.student_email,
    studentPhone: payload.student_phone,
    studentBatch: payload.student_batch,
    studentMajor: payload.student_major,
    notes: payload.notes,
    isFlagged: Boolean(payload.is_flagged),
    visitedAt: payload.visited_at,
  };
}

function extractFilename(headerValue: string | null, fallback: string) {
  if (!headerValue) {
    return fallback;
  }

  const match = /filename="?([^";]+)"?/i.exec(headerValue);
  return match?.[1] ?? fallback;
}

export default function CorporateDashboardClient({
  corporateClient,
  stall,
  initialVisits,
  pageSize,
  initialHasMore,
  initialNextOffset,
  sessionExpiresAt,
  exportDefaults,
  sessionTimeoutWarningOffsetMs,
}: CorporateDashboardClientProps) {
  const [visits, setVisits] = useState<StudentVisitUi[]>(initialVisits);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [showOnlyFlagged, setShowOnlyFlagged] = useState(exportDefaults.scope === "flagged");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exporting, setExporting] = useState<ExportScope | null>(null);
  const [updatingVisitId, setUpdatingVisitId] = useState<string | null>(null);
  const [deletingVisitId, setDeletingVisitId] = useState<string | null>(null);
  const [isMajorDropdownOpen, setIsMajorDropdownOpen] = useState(false);
  const majorDropdownRef = useRef<HTMLDivElement | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const isFirstSearchSyncRef = useRef(true);
  const [formState, setFormState] = useState({
    studentName: "",
    studentId: "",
    studentEmail: "",
    studentPhone: "",
    studentBatch: "",
    studentMajor: MAJOR_OPTIONS[0],
    notes: "",
    isFlagged: false,
  });
  const [isSubmitting, startSubmit] = useTransition();

  useEffect(() => {
    if (!isMajorDropdownOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (majorDropdownRef.current && !majorDropdownRef.current.contains(event.target as Node)) {
        setIsMajorDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMajorDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMajorDropdownOpen]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      const normalized = searchValue.replace(/\s+/g, " ").trim();
      setSearchQuery((previous) => (previous === normalized ? previous : normalized));
    }, 350);

    return () => window.clearTimeout(handler);
  }, [searchValue]);

  const logout = useLogout("/login/corporate");

  useSessionTimeout({
    expiresAt: sessionExpiresAt,
    warningMessage: "Your session will expire soon. Save your progress to avoid losing notes.",
    expirationMessage: "Your session has expired. Please sign in again.",
    warningOffsetMs: sessionTimeoutWarningOffsetMs,
    onExpire: async () => {
      toast.error("Your session has expired. Please sign in again.");
      await logout({ silent: true });
    },
  });

  const resetForm = useCallback(() => {
    setFormState({
      studentName: "",
      studentId: "",
      studentEmail: "",
      studentPhone: "",
      studentBatch: "",
      studentMajor: MAJOR_OPTIONS[0],
      notes: "",
      isFlagged: false,
    });
    setIsMajorDropdownOpen(false);
  }, []);

  const hasMap = Boolean(stall?.floor?.mapImageUrl);
  const floorLabel = useMemo(() => {
    if (!stall?.floor) {
      return "Unknown floor";
    }
    return stall.floor.name ? `${stall.floor.name}` : `Floor ${stall.floor.id}`;
  }, [stall?.floor]);

  const isDefaultScopeAll = exportDefaults.scope === "all";

  const emptyStateCopy = useMemo(() => {
    if (searchQuery) {
      return {
        title: showOnlyFlagged ? "No flagged visits match your search." : "No visits match your search.",
        subtitle: "Try different keywords or clear filters to see more students.",
      };
    }

    if (showOnlyFlagged) {
      return {
        title: "No flagged visits yet.",
        subtitle: "Flag students you want to follow up with and they will appear here.",
      };
    }

    return {
      title: "No visits logged yet.",
      subtitle: "Start capturing conversations to build your follow-up pipeline.",
    };
  }, [searchQuery, showOnlyFlagged]);

  const fetchVisitsPage = useCallback(
    async (offset: number, flagged: boolean, searchTerm = ""): Promise<VisitsQueryResult> => {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String(offset));
      if (flagged) {
        params.set("flagged", "true");
      }
      if (searchTerm) {
        params.set("q", searchTerm);
      }
      const data = await fetchJson<{
        visits: VisitApiPayload[];
        hasMore: boolean;
        nextOffset: number;
      }>(
        `/api/students/visits?${params.toString()}`,
        undefined,
        "Unable to load student visits."
      );

      return {
        visits: (data.visits ?? []).map(mapVisitFromApi),
        hasMore: Boolean(data.hasMore),
        nextOffset: Number.isFinite(data.nextOffset) ? data.nextOffset : offset,
      };
    },
    [pageSize]
  );

  const reloadVisits = useCallback(
    async (flagged: boolean, searchTerm = "", options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) {
        setIsRefreshing(true);
      }
      try {
        const result = await fetchVisitsPage(0, flagged, searchTerm);
        setVisits(result.visits);
        setHasMore(result.hasMore);
        setNextOffset(result.nextOffset);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error while loading visits.";
        toast.error(message);
      } finally {
        if (!silent) {
          setIsRefreshing(false);
        }
      }
    },
    [fetchVisitsPage]
  );

  useEffect(() => {
    if (isFirstSearchSyncRef.current) {
      isFirstSearchSyncRef.current = false;
      return;
    }

    void reloadVisits(showOnlyFlagged, searchQuery);
  }, [reloadVisits, searchQuery, showOnlyFlagged]);

  const handleToggleFlagFilter = useCallback(() => {
    const nextValue = !showOnlyFlagged;
    setShowOnlyFlagged(nextValue);
    void reloadVisits(nextValue, searchQuery);
  }, [reloadVisits, searchQuery, showOnlyFlagged]);

  const handleRefresh = useCallback(() => {
    void reloadVisits(showOnlyFlagged, searchQuery);
  }, [reloadVisits, searchQuery, showOnlyFlagged]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const result = await fetchVisitsPage(nextOffset, showOnlyFlagged, searchQuery);
      setVisits((previous) => [...previous, ...result.visits]);
      setHasMore(result.hasMore);
      setNextOffset(result.nextOffset);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load more visits.";
      toast.error(message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchVisitsPage, hasMore, isLoadingMore, nextOffset, searchQuery, showOnlyFlagged]);

  const handleExport = useCallback(
    async (scope: ExportScope) => {
      if (exporting) {
        return;
      }

      setExporting(scope);

      const exportVisits = async () => {
        const params = new URLSearchParams();
        if (scope === "flagged") {
          params.set("flagged", "true");
        }
        if (searchQuery) {
          params.set("q", searchQuery);
        }

        const query = params.toString();
        const response = await fetch(
          query ? `/api/students/visits/export?${query}` : "/api/students/visits/export"
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const message = (data as { error?: string }).error ?? "Unable to export visits.";
          throw new Error(message);
        }

        const blob = await response.blob();
        const filename = extractFilename(
          response.headers.get("content-disposition"),
          scope === "flagged" ? "flagged-student-visits.csv" : "student-visits.csv"
        );

        return { blob, filename };
      };

      try {
        const { blob, filename } = await toast.promise(exportVisits(), {
          loading: "Preparing CSV...",
          success: "CSV download started.",
          error: (error) => extractErrorMessage(error, "Unable to export visits."),
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        const message = extractErrorMessage(error, "Unexpected export error.");
        toast.error(message);
        console.error("Export visits error", error);
      } finally {
        setExporting(null);
      }
    },
    [exporting, searchQuery]
  );

  const handleCreateVisit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      startSubmit(async () => {
        try {
          const createVisit = async () =>
            fetchJson<{ visit: VisitApiPayload }>(
              "/api/students/visit",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  student_name: formState.studentName,
                  student_id: formState.studentId,
                  student_email: formState.studentEmail,
                  student_phone: formState.studentPhone.trim() ? formState.studentPhone.trim() : null,
                  student_batch: formState.studentBatch.trim(),
                  student_major: formState.studentMajor,
                  notes: formState.notes.trim() ? formState.notes.trim() : null,
                  is_flagged: formState.isFlagged,
                }),
              },
              "Unable to save the visit."
            );

          const data = await toast.promise(createVisit(), {
            loading: "Recording visit...",
            success: "Student visit recorded.",
            error: (error) => extractErrorMessage(error, "Unable to save the visit."),
          });

          const newVisit = mapVisitFromApi(data.visit);

          if (showOnlyFlagged && !newVisit.isFlagged) {
            toast.success("Visit logged. It is hidden while the flagged filter is active.");
          } else if (searchQuery) {
            void reloadVisits(showOnlyFlagged, searchQuery, { silent: true });
          } else {
            setVisits((previous) => [newVisit, ...previous]);
            setNextOffset((previous) => previous + 1);
          }
          resetForm();
        } catch (error) {
          const message = extractErrorMessage(error, "Unexpected error while saving the visit.");
          toast.error(message);
          console.error("Create visit error", error);
        }
      });
    },
    [formState, reloadVisits, resetForm, searchQuery, showOnlyFlagged, startSubmit]
  );

  const handleToggleFlagVisit = useCallback(
    async (visit: StudentVisitUi) => {
      if (!visit.studentBatch || !visit.studentMajor) {
        toast.error("Add the student's batch and major before updating this visit.");
        return;
      }

      setUpdatingVisitId(visit.id);
      let needsRefetch = false;

      try {
          const toggleVisit = async () =>
            fetchJson<{ visit: VisitApiPayload }>(
              `/api/students/visit/${visit.id}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  student_name: visit.studentName,
                  student_id: visit.studentId,
                  student_email: visit.studentEmail,
                  student_phone: visit.studentPhone,
                  student_batch: visit.studentBatch,
                  student_major: visit.studentMajor,
                  notes: visit.notes,
                  is_flagged: !visit.isFlagged,
                }),
              },
              "Unable to update the visit."
            );

          const data = await toast.promise(toggleVisit(), {
            loading: visit.isFlagged ? "Removing flag..." : "Flagging visit...",
            success: (result) =>
              result.visit.is_flagged ? "Visit flagged for follow-up." : "Flag removed.",
            error: (error) => extractErrorMessage(error, "Unable to update the visit."),
          });

          const updatedVisit = mapVisitFromApi(data.visit);

        if (showOnlyFlagged && !updatedVisit.isFlagged) {
          needsRefetch = true;
        } else {
          setVisits((previous) =>
            previous.map((entry) => (entry.id === updatedVisit.id ? updatedVisit : entry))
          );
        }
      } catch (error) {
          const message = extractErrorMessage(error, "Unable to update the visit.");
          toast.error(message);
          console.error("Toggle visit flag error", error);
      } finally {
        setUpdatingVisitId(null);
        if (needsRefetch) {
          void reloadVisits(showOnlyFlagged, searchQuery);
        }
      }
    },
    [reloadVisits, searchQuery, showOnlyFlagged]
  );

  const handleDeleteVisit = useCallback(
    async (visit: StudentVisitUi) => {
      if (!window.confirm(`Delete visit for ${visit.studentName}? This cannot be undone.`)) {
        return;
      }

      setDeletingVisitId(visit.id);
      try {
          const deleteVisit = async () =>
            fetchJson<{ success: boolean }>(
              `/api/students/visit/${visit.id}`,
              { method: "DELETE" },
              "Unable to delete the visit."
            );

          await toast.promise(deleteVisit(), {
            loading: "Deleting visit...",
            success: "Visit deleted.",
            error: (error) => extractErrorMessage(error, "Unable to delete the visit."),
          });

          await reloadVisits(showOnlyFlagged, searchQuery, { silent: false });
      } catch (error) {
          const message = extractErrorMessage(error, "Unexpected error while deleting.");
          toast.error(message);
          console.error("Delete visit error", error);
      } finally {
        setDeletingVisitId(null);
      }
    },
    [reloadVisits, searchQuery, showOnlyFlagged]
  );

  return (
    <main className="relative min-h-screen bg-white px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <section className="rounded-3xl border border-primary/20 bg-white p-8 shadow-xl">
          <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-7 w-7" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold text-text">Welcome, {corporateClient.companyName}</h1>
                <p className="mt-1 text-sm text-text/70">
                  Track student engagement, capture notes, and flag promising talent with ease.
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-text/80">
                  {corporateClient.stallNumber && (
                    <span className="rounded-full bg-primary/10 px-4 py-2 font-medium text-primary">
                      Stall #{corporateClient.stallNumber}
                    </span>
                  )}
                  {corporateClient.stallPosition && (
                    <span className="rounded-full bg-secondary/10 px-4 py-2 font-medium text-secondary">
                      Position: {corporateClient.stallPosition}
                    </span>
                  )}
                  {stall?.identifier && (
                    <span className="rounded-full bg-black/5 px-4 py-2 font-medium">
                      Stall code: {stall.identifier}
                    </span>
                  )}
                  {stall?.floor && (
                    <span className="rounded-full bg-black/5 px-4 py-2 font-medium">
                      {floorLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {hasMap ? (
                <Link
                  href="/dashboard/corporate/map"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90"
                >
                  <MapPinned className="h-4 w-4" /> View Stall Map
                </Link>
              ) : (
                <div className="rounded-2xl bg-black/5 px-4 py-3 text-sm text-text/70">
                  Map preview will appear once your stall floor plan is uploaded.
                </div>
              )}
              <LogoutButton redirectPath="/login/corporate" />
            </div>
          </header>
        </section>

        <section className="rounded-3xl border border-primary/15 bg-white p-8 shadow-lg">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text">Log a Student Visit</h2>
              <p className="text-sm text-text/70">
                Capture quick notes right after the conversation while the details are fresh.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/40 hover:text-primary/80"
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh Visits
            </button>
          </div>

          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateVisit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-text">
              Student Name
              <input
                type="text"
                required
                value={formState.studentName}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, studentName: event.target.value }))
                }
                className={inputFieldClasses}
                placeholder="Ayesha Khan"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-text">
              Habib ID
              <input
                type="text"
                required
                value={formState.studentId}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, studentId: event.target.value.toUpperCase() }))
                }
                className={inputFieldClasses}
                placeholder="CS12345"
                pattern="^[A-Za-z]{2}\d{5}$"
                title="Use two letters followed by five digits, e.g. CS12345"
                autoCapitalize="characters"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-text">
              Email
              <input
                type="email"
                required
                value={formState.studentEmail}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, studentEmail: event.target.value }))
                }
                className={inputFieldClasses}
                placeholder="ayesha.khan@example.com"
                inputMode="email"
                spellCheck={false}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-text">
              Batch
              <input
                type="text"
                required
                value={formState.studentBatch}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, studentBatch: event.target.value }))
                }
                className={inputFieldClasses}
                placeholder="Batch 2026"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-text">
              Major
              <div className="relative" ref={majorDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsMajorDropdownOpen((state) => !state)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setIsMajorDropdownOpen(true);
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-3xl border border-white/30 bg-white/20 px-4 py-3 text-base text-text shadow-lg backdrop-blur-md transition hover:bg-white/30 focus:border-primary focus:bg-white/40 focus:text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
                  aria-haspopup="listbox"
                  aria-expanded={isMajorDropdownOpen}
                >
                  <span>{formState.studentMajor}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-primary/70 transition-transform ${
                      isMajorDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isMajorDropdownOpen && (
                    <motion.ul
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute z-30 mt-3 w-full overflow-hidden rounded-3xl border border-white/30 bg-white/25 p-2 shadow-2xl backdrop-blur-xl"
                      role="listbox"
                    >
                      {MAJOR_OPTIONS.map((option) => {
                        const isSelected = option === formState.studentMajor;
                        return (
                          <li key={option}>
                            <button
                              type="button"
                              onClick={() => {
                                setFormState((state) => ({ ...state, studentMajor: option }));
                                setIsMajorDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                isSelected
                                  ? "bg-primary/20 text-primary"
                                  : "text-text/80 hover:bg-white/40 hover:text-primary"
                              }`}
                              role="option"
                              aria-selected={isSelected}
                            >
                              <span>{option}</span>
                              {isSelected && <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />}
                            </button>
                          </li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-text">
              Phone
              <input
                type="tel"
                value={formState.studentPhone}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, studentPhone: event.target.value }))
                }
                className={inputFieldClasses}
                placeholder="03XX-XXXXXXX"
              />
            </label>

            <label className="md:col-span-2 flex flex-col gap-2 text-sm font-medium text-text">
              Notes
              <textarea
                rows={3}
                value={formState.notes}
                onChange={(event) => setFormState((state) => ({ ...state, notes: event.target.value }))}
                className={`${inputFieldClasses} resize-none`}
                placeholder="Strong interest in data science internship, resume shared."
              />
            </label>

            <label className="md:col-span-2 flex items-center gap-3 text-sm font-medium text-text">
              <input
                type="checkbox"
                checked={formState.isFlagged}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, isFlagged: event.target.checked }))
                }
                className="h-5 w-5 rounded border-white/40 bg-white/30 text-primary shadow focus:ring-primary/40"
              />
              Flag for follow-up
            </label>

            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-80"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log Visit"}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={resetForm}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 px-6 py-3 text-sm font-semibold text-primary transition hover:border-primary/40 hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-primary/15 bg-white p-8 shadow-lg">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text">Recent Student Visits</h2>
              <p className="text-sm text-text/70">
                {showOnlyFlagged
                  ? "Showing only flagged students that require follow-up."
                  : "Newest conversations appear first."}
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end md:gap-4">
              <div className="relative w-full md:w-64">
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && searchValue) {
                      event.preventDefault();
                      setSearchValue("");
                    }
                  }}
                  className="w-full rounded-full border border-primary/20 bg-white/70 px-4 py-2 text-sm text-text shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Search by name, email, ID, or notes"
                  aria-label="Search student visits"
                  inputMode="search"
                  spellCheck={false}
                />
                {searchValue ? (
                  <button
                    type="button"
                    onClick={() => setSearchValue("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary/70 transition hover:text-primary"
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleFlagFilter}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    showOnlyFlagged
                      ? "bg-secondary text-white shadow-lg"
                      : "border border-primary/20 text-primary hover:border-primary/40 hover:text-primary/80"
                  }`}
                >
                  {showOnlyFlagged ? <FlagOff className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
                  {showOnlyFlagged ? "Show All" : "Only Flagged"}
                </button>

                <button
                  type="button"
                  disabled={exporting === "all"}
                  onClick={() => void handleExport("all")}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isDefaultScopeAll
                      ? "bg-primary text-white shadow-lg hover:bg-primary/90"
                      : "border border-primary/20 text-primary hover:border-primary/40 hover:text-primary/80"
                  }`}
                >
                  {exporting === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Export All
                </button>

                <button
                  type="button"
                  disabled={exporting === "flagged"}
                  onClick={() => void handleExport("flagged")}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isDefaultScopeAll
                      ? "border border-secondary/30 text-secondary hover:border-secondary/50 hover:text-secondary/80"
                      : "bg-secondary text-white shadow-lg hover:bg-secondary/90"
                  }`}
                >
                  {exporting === "flagged" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Export Flagged
                </button>
              </div>
            </div>
          </div>

          <div className="relative">
            {isRefreshing && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {visits.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-primary/30 p-10 text-center text-text/70">
                <AlertTriangle className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold text-text">{emptyStateCopy.title}</p>
                  <p className="text-sm">{emptyStateCopy.subtitle}</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {visits.map((visit) => {
                  const isUpdating = updatingVisitId === visit.id;
                  const isDeleting = deletingVisitId === visit.id;

                  return (
                    <article
                      key={visit.id}
                      className="rounded-2xl border border-primary/20 bg-white p-6 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-semibold text-text">{visit.studentName}</h3>
                            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text/70">
                              {visit.studentId}
                            </span>
                            {visit.isFlagged && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                                <Flag className="h-3 w-3" /> Flagged
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-text/70">
                            <p>
                              <span className="font-medium">Email:</span> {visit.studentEmail}
                            </p>
                            {visit.studentPhone && (
                              <p>
                                <span className="font-medium">Phone:</span> {visit.studentPhone}
                              </p>
                            )}
                            {visit.studentBatch && (
                              <p>
                                <span className="font-medium">Batch:</span> {visit.studentBatch}
                              </p>
                            )}
                            {visit.studentMajor && (
                              <p>
                                <span className="font-medium">Major:</span> {visit.studentMajor}
                              </p>
                            )}
                            <p className="mt-1 text-xs uppercase tracking-wide text-text/60">
                              Visited {formatVisitDate(visit.visitedAt)}
                            </p>
                          </div>
                          {visit.notes && (
                            <p className="mt-3 rounded-2xl bg-black/5 p-4 text-sm text-text/80">
                              {visit.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-stretch gap-3 md:items-end">
                          <button
                            type="button"
                            onClick={() => void handleToggleFlagVisit(visit)}
                            disabled={isUpdating || isDeleting}
                            className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              visit.isFlagged
                                ? "border border-secondary/40 text-secondary hover:border-secondary/60"
                                : "border border-primary/30 text-primary hover:border-primary/60"
                            }`}
                          >
                            {isUpdating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : visit.isFlagged ? (
                              <FlagOff className="h-4 w-4" />
                            ) : (
                              <Flag className="h-4 w-4" />
                            )}
                            {visit.isFlagged ? "Remove Flag" : "Flag"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDeleteVisit(visit)}
                            disabled={isDeleting || isUpdating}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-500 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {hasMore && visits.length > 0 && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => void handleLoadMore()}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-6 py-3 text-sm font-semibold text-primary transition hover:border-primary/50 hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load More"}
              </button>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-primary/15 bg-white p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-text">Need assistance?</h2>
          <p className="mt-2 text-sm text-text/70">
            Reach out to the Career City support desk for onboarding help, data corrections, or new feature
            requests.
          </p>
          <Link
            href="mailto:career.city@habib.edu.pk"
            className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 px-5 py-3 text-sm font-semibold text-primary transition hover:border-primary/40 hover:text-primary/80"
          >
            Email Support
          </Link>
        </section>
      </div>
    </main>
  );
}
