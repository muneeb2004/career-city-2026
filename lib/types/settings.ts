export type ExportScope = "all" | "flagged";
export type ExportFormat = "csv" | "pdf";

export interface AdminSettings {
  id: string | null;
  eventStartAt: string | null;
  eventEndAt: string | null;
  announcementEnabled: boolean;
  announcementTitle: string | null;
  announcementMessage: string | null;
  defaultExportScope: ExportScope;
  defaultExportFormat: ExportFormat;
  sessionTimeoutMinutes: number;
  jwtTtlHours: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  id: null,
  eventStartAt: null,
  eventEndAt: null,
  announcementEnabled: false,
  announcementTitle: null,
  announcementMessage: null,
  defaultExportScope: "all",
  defaultExportFormat: "csv",
  sessionTimeoutMinutes: 45,
  jwtTtlHours: 24,
  updatedAt: null,
  updatedBy: null,
};
