"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Megaphone, X } from "lucide-react";
import type { AdminSettings } from "@/lib/types/settings";

interface GlobalAnnouncementProps {
  settings: AdminSettings;
}

const ANNOUNCEMENT_STORAGE_PREFIX = "career-city-announcement";

function formatEventRange(startIso: string | null, endIso: string | null) {
  if (!startIso || !endIso) {
    return null;
  }

  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export default function GlobalAnnouncement({ settings }: GlobalAnnouncementProps) {
  const hasAnnouncementCopy = Boolean(settings.announcementTitle || settings.announcementMessage);
  const shouldShowBanner = settings.announcementEnabled && hasAnnouncementCopy;
  const eventRangeCopy = useMemo(
    () => formatEventRange(settings.eventStartAt, settings.eventEndAt),
    [settings.eventEndAt, settings.eventStartAt]
  );

  const storageKey = `${ANNOUNCEMENT_STORAGE_PREFIX}-${settings.updatedAt ?? "v0"}`;

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    try {
      return window.sessionStorage.getItem(storageKey) === "1";
    } catch (error) {
      console.warn("Unable to access session storage for announcement state", error);
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch (error) {
      console.warn("Unable to persist announcement dismissal", error);
    }
  };

  if (!shouldShowBanner || dismissed) {
    return eventRangeCopy ? (
      <div className="relative z-50 flex items-center justify-center bg-gradient-to-r from-primary/10 via-white to-secondary/10 px-4 py-2 text-xs font-medium text-text/70">
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Event window: {eventRangeCopy}
        </span>
      </div>
    ) : null;
  }

  return (
    <div className="relative z-50 flex flex-col gap-2 border-b border-primary/20 bg-gradient-to-r from-primary/90 via-primary to-secondary/80 px-4 py-3 text-white shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
            <Megaphone className="h-4 w-4" />
            {settings.announcementTitle ?? "Announcement"}
          </span>
          {settings.announcementMessage ? (
            <p className="text-sm leading-relaxed text-white/90">{settings.announcementMessage}</p>
          ) : null}
          {eventRangeCopy ? (
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/70">
              <CalendarDays className="h-3 w-3" /> Event window: {eventRangeCopy}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Dismiss announcement"
          onClick={handleDismiss}
          className="rounded-full bg-white/10 p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
