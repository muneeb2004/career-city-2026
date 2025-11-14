export interface SupabaseCorporateClientRow {
  id: string;
  company_name: string | null;
}

export interface SupabaseStallPosition {
  x?: number | null;
  y?: number | null;
}

export interface SupabaseStallRow {
  id: string;
  stall_identifier: string | null;
  position: SupabaseStallPosition | null;
  corporate_client_id: string | null;
  corporate_client?: SupabaseCorporateClientRow | SupabaseCorporateClientRow[] | null;
  floor_id?: string;
}

export interface SupabaseFloorRow {
  id: string;
  name: string | null;
  map_image_url: string | null;
  order_index: number | null;
  created_at: string;
  stalls?: SupabaseStallRow[] | null;
}

export interface NormalizedStall {
  id: string;
  identifier: string;
  x: number;
  y: number;
  corporateClientId: string | null;
  corporateClientName: string | null;
  floorId?: string;
}

export interface NormalizedFloor {
  id: string;
  name: string;
  mapImageUrl: string;
  orderIndex: number;
  createdAt: string;
  stalls: NormalizedStall[];
}

export function normalizeStallRow(row: SupabaseStallRow): NormalizedStall {
  const corporateClient = Array.isArray(row.corporate_client)
    ? row.corporate_client[0]
    : row.corporate_client;

  return {
    id: row.id,
    identifier: row.stall_identifier ?? "",
    x: Number(row.position?.x ?? 0),
    y: Number(row.position?.y ?? 0),
    corporateClientId: row.corporate_client_id ?? null,
    corporateClientName: corporateClient?.company_name ?? null,
    floorId: row.floor_id,
  };
}

export function normalizeFloorRow(row: SupabaseFloorRow): NormalizedFloor {
  return {
    id: row.id,
    name: row.name ?? "Untitled floor",
    mapImageUrl: row.map_image_url ?? "",
    orderIndex: row.order_index ?? 0,
    createdAt: row.created_at,
    stalls: (row.stalls ?? []).map(normalizeStallRow),
  };
}
