export interface FloorStall {
  id: string;
  identifier: string;
  x: number;
  y: number;
  corporateClientId: string | null;
  corporateClientName: string | null;
}

export interface FloorViewModel {
  id: string;
  name: string;
  mapImageUrl: string;
  orderIndex: number;
  createdAt: string;
  stalls: FloorStall[];
}

export interface SelectOption {
  id: string;
  companyName: string;
}
