export interface SpaceStatus {
  space_id: number;
  space_name: string;
  count: number;
  result: string;
  last_update: string | null;
}

export interface HistoryPoint {
  time: string;
  count: number;
}

export interface SpaceHistory {
  target: HistoryPoint[];
  comparison: HistoryPoint[];
}
