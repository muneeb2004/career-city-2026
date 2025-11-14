"use client";

import { FormEvent, useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "react-hot-toast";
import { CalendarDays, Clock, Globe2, Megaphone, ShieldCheck } from "lucide-react";
import { fetchJson, extractErrorMessage } from "@/lib/client/api";
import type { AdminSettings, ExportScope, ExportFormat } from "@/lib/types/settings";

interface AdminSettingsClientProps {
  initialSettings: AdminSettings;
}

interface FormState {
  eventStartAt: string;
  eventEndAt: string;
  announcementEnabled: boolean;
  announcementTitle: string;
  announcementMessage: string;
  defaultExportScope: ExportScope;
  defaultExportFormat: ExportFormat;
  sessionTimeoutMinutes: string;
  jwtTtlHours: string;
}

interface UpdateResponse {
  settings: AdminSettings;
}

const sectionClasses =
  "rounded-3xl border border-primary/10 bg-white/80 p-8 shadow-lg backdrop-blur";

function toDateInputValue(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().split("T")[0] ?? "";
}

function createFormState(settings: AdminSettings): FormState {
  return {
    eventStartAt: toDateInputValue(settings.eventStartAt),
    eventEndAt: toDateInputValue(settings.eventEndAt),
    announcementEnabled: settings.announcementEnabled,
    announcementTitle: settings.announcementTitle ?? "",
    announcementMessage: settings.announcementMessage ?? "",
    defaultExportScope: settings.defaultExportScope,
    defaultExportFormat: settings.defaultExportFormat,
    sessionTimeoutMinutes: String(settings.sessionTimeoutMinutes),
    jwtTtlHours: String(settings.jwtTtlHours),
  };
}

function describeEventWindow(settings: AdminSettings) {
  if (!settings.eventStartAt || !settings.eventEndAt) {
    return "Event window is not configured yet.";
  }

  const start = new Date(settings.eventStartAt);
  const end = new Date(settings.eventEndAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Unable to interpret event window dates.";
  }

  const startFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
  const endFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });

  return `Runs ${startFormatter.format(start)} through ${endFormatter.format(end)}`;
}

export default function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
  const [currentSettings, setCurrentSettings] = useState<AdminSettings>(initialSettings);
  const [formState, setFormState] = useState<FormState>(() => createFormState(initialSettings));
  const [isPending, startTransition] = useTransition();

  const hasChanges = useMemo(() => {
    const baseline = createFormState(currentSettings);
    return (Object.keys(formState) as Array<keyof FormState>).some((key) => {
      const currentValue = formState[key];
      const baselineValue = baseline[key];
      if (typeof currentValue === "string") {
        return currentValue.trim() !== String(baselineValue ?? "").trim();
      }
      return currentValue !== baselineValue;
    });
  }, [currentSettings, formState]);

  const eventWindowDescription = useMemo(() => describeEventWindow(currentSettings), [currentSettings]);

  const sessionWarningLeadMinutes = useMemo(() => {
    const parsed = Number.parseInt(formState.sessionTimeoutMinutes, 10);
    if (!Number.isFinite(parsed) || parsed <= 6) {
      return Math.max(parsed - 1, 1) || 1;
    }
    return parsed - 5;
  }, [formState.sessionTimeoutMinutes]);

  const lastUpdatedCopy = useMemo(() => {
    if (!currentSettings.updatedAt) {
      return "Not saved yet";
    }
    const updatedDate = new Date(currentSettings.updatedAt);
    if (Number.isNaN(updatedDate.getTime())) {
      return "Last update timestamp unavailable";
    }
    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `${formatter.format(updatedDate)}${currentSettings.updatedBy ? ` · updated by ${currentSettings.updatedBy.slice(0, 8)}` : ""}`;
  }, [currentSettings.updatedAt, currentSettings.updatedBy]);

  const handleInputChange = useCallback(
    (key: keyof FormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = event.target.type === "checkbox" ? (event.target as HTMLInputElement).checked : event.target.value;
        setFormState((previous) => ({ ...previous, [key]: value }));
      },
    []
  );

  const handleScopeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === "flagged" ? "flagged" : "all";
    setFormState((previous) => ({ ...previous, defaultExportScope: value }));
  }, []);

  const handleFormatChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === "pdf" ? "pdf" : "csv";
    setFormState((previous) => ({ ...previous, defaultExportFormat: value }));
  }, []);

  const handleReset = useCallback(() => {
    setFormState(createFormState(currentSettings));
  }, [currentSettings]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!hasChanges) {
        toast("No changes to save.");
        return;
      }

      const payload = {
        eventStartAt: formState.eventStartAt,
        eventEndAt: formState.eventEndAt,
        announcementEnabled: formState.announcementEnabled,
        announcementTitle: formState.announcementTitle,
        announcementMessage: formState.announcementMessage,
        defaultExportScope: formState.defaultExportScope,
        defaultExportFormat: formState.defaultExportFormat,
        sessionTimeoutMinutes: Number.parseInt(formState.sessionTimeoutMinutes, 10),
        jwtTtlHours: Number.parseInt(formState.jwtTtlHours, 10),
      };

      startTransition(() => {
        const saveSettings = async () =>
          fetchJson<UpdateResponse>(
            "/api/admin/settings",
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
            "Unable to update admin settings."
          );

        void toast.promise(saveSettings(), {
          loading: "Saving settings...",
          success: "Admin settings updated.",
          error: (error) => extractErrorMessage(error, "Unable to update admin settings."),
        })
          .then((response) => {
            if (!response) {
              return;
            }
            setCurrentSettings(response.settings);
            setFormState(createFormState(response.settings));
          })
          .catch((error) => {
            const message = extractErrorMessage(error, "Unexpected error while saving settings.");
            toast.error(message);
          });
      });
    },
    [formState, hasChanges, startTransition]
  );

  return (
    <div className="bg-gradient-to-br from-primary/5 via-white to-secondary/5">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Career City Configuration</p>
            <h1 className="mt-2 text-3xl font-semibold text-text">Admin Settings</h1>
            <p className="mt-2 max-w-2xl text-sm text-text/70">
              Manage global toggles for the event experience, announcement banner, export defaults, and security policies.
            </p>
          </div>
          <div className="rounded-3xl border border-primary/15 bg-white/70 px-5 py-3 text-sm text-text/70 shadow-sm">
            <span className="font-medium text-text">Last update</span> · {lastUpdatedCopy}
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <section className={sectionClasses}>
            <header className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-text">Event schedule</h2>
                <p className="text-sm text-text/70">Set the official window for Career City so timelines stay aligned.</p>
              </div>
            </header>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-text">
                Event start date
                <input
                  type="date"
                  value={formState.eventStartAt}
                  onChange={handleInputChange("eventStartAt")}
                  className="rounded-3xl border border-primary/20 bg-white/70 px-4 py-3 text-sm text-text shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-text">
                Event end date
                <input
                  type="date"
                  value={formState.eventEndAt}
                  onChange={handleInputChange("eventEndAt")}
                  className="rounded-3xl border border-primary/20 bg-white/70 px-4 py-3 text-sm text-text shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>

            <p className="mt-4 text-sm text-text/60">{eventWindowDescription}</p>
          </section>

          <section className={sectionClasses}>
            <header className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                <Megaphone className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-text">Announcement banner</h2>
                <p className="text-sm text-text/70">Toggle a global banner to surface urgent updates across dashboards.</p>
              </div>
            </header>

            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3 text-sm font-medium text-text">
                <input
                  type="checkbox"
                  checked={formState.announcementEnabled}
                  onChange={handleInputChange("announcementEnabled")}
                  className="h-5 w-5 rounded border-primary/30 text-primary focus:ring-primary/40"
                />
                Enable banner across all surfaces
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-text">
                Banner title
                <input
                  type="text"
                  value={formState.announcementTitle}
                  onChange={handleInputChange("announcementTitle")}
                  placeholder="e.g. Day 2 kicks off at 10:00 AM"
                  maxLength={120}
                  className="rounded-3xl border border-primary/20 bg-white/70 px-4 py-3 text-sm text-text shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-text">
                Banner message
                <textarea
                  rows={4}
                  value={formState.announcementMessage}
                  onChange={handleInputChange("announcementMessage")}
                  placeholder="Share key logistics, shuttle timings, or reminders."
                  maxLength={1000}
                  className="rounded-3xl border border-primary/20 bg-white/70 px-4 py-3 text-sm text-text shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>
          </section>

          <section className={sectionClasses}>
            <header className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Globe2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-text">Export defaults</h2>
                <p className="text-sm text-text/70">Pick the baseline export scope and format for corporate dashboards.</p>
              </div>
            </header>

            <div className="grid gap-6 md:grid-cols-2">
              <fieldset className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-white/70 p-5 text-sm text-text">
                <legend className="mb-2 text-xs uppercase tracking-wide text-text/60">Preferred scope</legend>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="export-scope"
                    value="all"
                    checked={formState.defaultExportScope === "all"}
                    onChange={handleScopeChange}
                  />
                  Export all visits by default
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="export-scope"
                    value="flagged"
                    checked={formState.defaultExportScope === "flagged"}
                    onChange={handleScopeChange}
                  />
                  Focus on flagged follow-ups
                </label>
              </fieldset>

              <fieldset className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-white/70 p-5 text-sm text-text">
                <legend className="mb-2 text-xs uppercase tracking-wide text-text/60">Preferred format</legend>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="export-format"
                    value="csv"
                    checked={formState.defaultExportFormat === "csv"}
                    onChange={handleFormatChange}
                  />
                  CSV spreadsheet (current)
                </label>
                <label className="flex items-center gap-3 opacity-70">
                  <input
                    type="radio"
                    name="export-format"
                    value="pdf"
                    checked={formState.defaultExportFormat === "pdf"}
                    onChange={handleFormatChange}
                    disabled
                  />
                  PDF summary (coming soon)
                </label>
              </fieldset>
            </div>
          </section>

          <section className={sectionClasses}>
            <header className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-text">Security & sessions</h2>
                <p className="text-sm text-text/70">
                  Define session timeout thresholds and JWT lifetimes to keep access tight across devices.
                </p>
              </div>
            </header>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-text">
                Session timeout (minutes)
                <input
                  type="number"
                  min={10}
                  max={480}
                  value={formState.sessionTimeoutMinutes}
                  onChange={handleInputChange("sessionTimeoutMinutes")}
                  className="rounded-3xl border border-primary/20 bg-white/70 px-4 py-3 text-sm text-text shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-text">
                JWT lifetime (hours)
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={formState.jwtTtlHours}
                  onChange={handleInputChange("jwtTtlHours")}
                  className="rounded-3xl border border-primary/20 bg-white/70 px-4 py-3 text-sm text-text shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>

            <p className="mt-4 flex items-center gap-2 text-sm text-text/60">
              <Clock className="h-4 w-4" />
              Active sessions warn users {sessionWarningLeadMinutes} minute{sessionWarningLeadMinutes === 1 ? "" : "s"} before expiry.
            </p>
          </section>

          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 rounded-3xl border border-primary/10 bg-white/80 px-6 py-4 shadow-lg backdrop-blur">
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending || !hasChanges}
              className="rounded-full border border-primary/20 px-5 py-2 text-sm font-semibold text-primary transition hover:border-primary/40 hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isPending || !hasChanges}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save settings"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
