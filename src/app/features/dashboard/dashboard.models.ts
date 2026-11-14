/*
 * ASSUMED wire contract (no OpenAPI yet) - see docs/backend-dependencies.md.
 * Only fields the backend actually sends are shown; nothing is computed or invented client-side.
 */
export type DashboardRange = 'today' | '7d' | '30d';

export const RANGE_LABELS: Record<DashboardRange, string> = {
  today: 'امروز',
  '7d': '۷ روز اخیر',
  '30d': '۳۰ روز اخیر',
};

export interface StatusCount {
  status: string;
  /** Optional backend-provided label; otherwise the UI's known label or the raw key. */
  label?: string | null;
  count: number;
}

export interface SalesPoint {
  date: string;
  salesRial: number;
  ordersCount?: number;
}

export interface DashboardSummary {
  range?: { from: string; to: string } | null;
  ordersCount: number;
  /** Paid sales in integer Rial. */
  salesRial: number;
  averageOrderRial?: number | null;
  ordersByStatus: StatusCount[];
  salesSeries?: SalesPoint[];
  pendingOrdersCount?: number | null;
  lowStockCount?: number | null;
}
