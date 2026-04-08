export interface Point {
  id: string;
  age: number;
  month: number;
  motivation: number;
  event: string;
  deepDive: string;
}

export type ViewMode = "year" | "month";
export type LineStyle = "curve" | "straight";