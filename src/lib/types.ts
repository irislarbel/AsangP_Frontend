export interface SpaceStatus {
  space_id: number;
  space_name: string;
  congestion_level: number;
  last_update: string | null;
}

export interface HistoryPoint {
  time: string;
  congestion_level: number;
}

export interface SpaceHistory {
  target: HistoryPoint[];
  comparison: HistoryPoint[];
}
