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

export interface PeakData {
  date: string;
  peak_ranges: string[];
  max_congestion: number;
  daily_trend: (number | null)[];
}

export interface PeakResponse {
  space_id: number;
  target_date: string;
  threshold: number;
  data: PeakData[];
}
