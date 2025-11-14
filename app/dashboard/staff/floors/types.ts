import type { NormalizedFloor, NormalizedStall } from "@/lib/types/floors";

export type FloorStall = NormalizedStall;

export type FloorViewModel = NormalizedFloor;

export interface SelectOption {
  id: string;
  companyName: string;
}
