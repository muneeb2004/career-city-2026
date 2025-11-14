import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import {
  DEFAULT_ADMIN_SETTINGS,
  type ExportFormat,
  type ExportScope,
} from "@/lib/types/settings";
import {
  getAdminSettings,
  normalizeAdminSettingsRow,
} from "@/lib/settings";

interface AuthResult {
  payload?: {
    sub?: string;
    role?: string;
  };
  error?: NextResponse;
}

const SETTINGS_SELECT_COLUMNS =
  "id, event_start_at, event_end_at, announcement_enabled, announcement_title, announcement_message, default_export_scope, default_export_format, session_timeout_minutes, jwt_ttl_hours, updated_at, updated_by";

const MIN_SESSION_TIMEOUT = 10;
const MAX_SESSION_TIMEOUT = 480;
const MIN_JWT_TTL = 1;
const MAX_JWT_TTL = 168;
const TITLE_MAX_LENGTH = 120;
const MESSAGE_MAX_LENGTH = 1000;

async function authenticateStaff(request: NextRequest): Promise<AuthResult> {
  const cookieToken = request.cookies.get("token")?.value;
  const bearerToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const token = cookieToken ?? bearerToken ?? null;

  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    const payload = await verifyJWT(token);
    if (!payload.role || !["super_admin", "staff"].includes(payload.role)) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { payload };
  } catch (error) {
    console.error("admin settings authentication failed", error);
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
}

function normalizeDateInput(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  const isoCandidate = dateOnlyPattern.test(trimmed) ? `${trimmed}T00:00:00.000Z` : trimmed;
  const date = new Date(isoCandidate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const lowered = value.toLowerCase();
    if (lowered === "true") {
      return true;
    }
    if (lowered === "false") {
      return false;
    }
  }
  return fallback;
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, maxLength);
}

function normalizeExportScope(value: unknown): ExportScope {
  return value === "flagged" ? "flagged" : "all";
}

function normalizeExportFormat(value: unknown): ExportFormat {
  return value === "pdf" ? "pdf" : "csv";
}

export async function GET(request: NextRequest) {
  const auth = await authenticateStaff(request);
  if (auth.error) {
    return auth.error;
  }

  const settings = await getAdminSettings();
  return NextResponse.json({ settings, canEdit: auth.payload?.role === "super_admin" });
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateStaff(request);
  if (auth.error) {
    return auth.error;
  }

  if (auth.payload?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch (error) {
    console.error("admin settings parse error", error);
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const eventStartAt = normalizeDateInput(body.eventStartAt);
  const eventEndAt = normalizeDateInput(body.eventEndAt);

  if (eventStartAt && eventEndAt) {
    if (new Date(eventEndAt).getTime() < new Date(eventStartAt).getTime()) {
      return NextResponse.json(
        { error: "Event end date must be after the start date." },
        { status: 400 }
      );
    }
  }

  const announcementEnabled = normalizeBoolean(body.announcementEnabled, DEFAULT_ADMIN_SETTINGS.announcementEnabled);
  const announcementTitle = sanitizeText(body.announcementTitle, TITLE_MAX_LENGTH);
  const announcementMessage = sanitizeText(body.announcementMessage, MESSAGE_MAX_LENGTH);
  const defaultExportScope = normalizeExportScope(body.defaultExportScope);
  const defaultExportFormat = normalizeExportFormat(body.defaultExportFormat);

  if (announcementEnabled && !announcementTitle && !announcementMessage) {
    return NextResponse.json(
      { error: "Provide a title or message when enabling the announcement banner." },
      { status: 400 }
    );
  }

  const rawSessionTimeout = Number(body.sessionTimeoutMinutes);
  const sessionTimeoutMinutes = Number.isFinite(rawSessionTimeout)
    ? Math.max(MIN_SESSION_TIMEOUT, Math.min(MAX_SESSION_TIMEOUT, Math.trunc(rawSessionTimeout)))
    : DEFAULT_ADMIN_SETTINGS.sessionTimeoutMinutes;

  const rawJwtTtl = Number(body.jwtTtlHours);
  const jwtTtlHours = Number.isFinite(rawJwtTtl)
    ? Math.max(MIN_JWT_TTL, Math.min(MAX_JWT_TTL, Math.trunc(rawJwtTtl)))
    : DEFAULT_ADMIN_SETTINGS.jwtTtlHours;

  const updates = {
    singleton: true,
    event_start_at: eventStartAt,
    event_end_at: eventEndAt,
    announcement_enabled: announcementEnabled,
    announcement_title: announcementTitle,
    announcement_message: announcementMessage,
    default_export_scope: defaultExportScope,
    default_export_format: defaultExportFormat,
    session_timeout_minutes: sessionTimeoutMinutes,
    jwt_ttl_hours: jwtTtlHours,
  updated_at: new Date().toISOString(),
    updated_by: auth.payload?.sub ?? null,
  };

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("admin_settings")
      .upsert(updates, { onConflict: "singleton" })
      .select(SETTINGS_SELECT_COLUMNS)
      .maybeSingle();

    if (error) {
      console.error("admin settings update failed", error);
      return NextResponse.json({ error: "Unable to update settings." }, { status: 500 });
    }

    const settings = normalizeAdminSettingsRow(data as Record<string, unknown> | null);
    return NextResponse.json({ settings, canEdit: true });
  } catch (error) {
    console.error("admin settings unexpected error", error);
    return NextResponse.json({ error: "Unexpected error while saving settings." }, { status: 500 });
  }
}
