import { getSupabaseAdminClient } from "./supabase";
import {
  AdminSettings,
  DEFAULT_ADMIN_SETTINGS,
  type ExportFormat,
  type ExportScope,
} from "./types/settings";

const SETTINGS_SELECT_COLUMNS =
  "id, event_start_at, event_end_at, announcement_enabled, announcement_title, announcement_message, default_export_scope, default_export_format, session_timeout_minutes, jwt_ttl_hours, updated_at, updated_by";

const SETTINGS_INSERT_DEFAULT = {
  singleton: true,
};

function mapExportScope(value: unknown): ExportScope {
  return value === "flagged" ? "flagged" : "all";
}

function mapExportFormat(value: unknown): ExportFormat {
  return value === "pdf" ? "pdf" : "csv";
}

export function normalizeAdminSettingsRow(row: Record<string, unknown> | null): AdminSettings {
  if (!row) {
    return DEFAULT_ADMIN_SETTINGS;
  }

  return {
    id: typeof row.id === "string" ? row.id : DEFAULT_ADMIN_SETTINGS.id,
    eventStartAt: typeof row.event_start_at === "string" ? row.event_start_at : null,
    eventEndAt: typeof row.event_end_at === "string" ? row.event_end_at : null,
    announcementEnabled: Boolean(row.announcement_enabled),
    announcementTitle:
      typeof row.announcement_title === "string" && row.announcement_title.trim()
        ? row.announcement_title
        : null,
    announcementMessage:
      typeof row.announcement_message === "string" && row.announcement_message.trim()
        ? row.announcement_message
        : null,
    defaultExportScope: mapExportScope(row.default_export_scope),
    defaultExportFormat: mapExportFormat(row.default_export_format),
    sessionTimeoutMinutes:
      typeof row.session_timeout_minutes === "number" && Number.isFinite(row.session_timeout_minutes)
        ? Math.max(10, Math.min(480, Math.trunc(row.session_timeout_minutes)))
        : DEFAULT_ADMIN_SETTINGS.sessionTimeoutMinutes,
    jwtTtlHours:
      typeof row.jwt_ttl_hours === "number" && Number.isFinite(row.jwt_ttl_hours)
        ? Math.max(1, Math.min(168, Math.trunc(row.jwt_ttl_hours)))
        : DEFAULT_ADMIN_SETTINGS.jwtTtlHours,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
    updatedBy: typeof row.updated_by === "string" ? row.updated_by : null,
  };
}

export async function getAdminSettings(): Promise<AdminSettings> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("admin_settings")
      .select(SETTINGS_SELECT_COLUMNS)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to load admin settings", error);
      return DEFAULT_ADMIN_SETTINGS;
    }

    if (data) {
  return normalizeAdminSettingsRow(data as Record<string, unknown>);
    }

    const { data: inserted, error: insertError } = await supabase
      .from("admin_settings")
      .insert(SETTINGS_INSERT_DEFAULT)
      .select(SETTINGS_SELECT_COLUMNS)
      .maybeSingle();

    if (insertError) {
      // Handle race condition when another request inserted simultaneously.
      if (insertError.code === "23505") {
        const { data: retryRow } = await supabase
          .from("admin_settings")
          .select(SETTINGS_SELECT_COLUMNS)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
  return normalizeAdminSettingsRow(retryRow as Record<string, unknown> | null);
      }

      console.error("Failed to initialize admin settings", insertError);
      return DEFAULT_ADMIN_SETTINGS;
    }

  return normalizeAdminSettingsRow(inserted as Record<string, unknown> | null);
  } catch (error) {
    console.error("Unexpected admin settings fetch error", error);
    return DEFAULT_ADMIN_SETTINGS;
  }
}
