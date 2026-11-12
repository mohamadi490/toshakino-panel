/*
 * ASSUMED wire contract (no OpenAPI yet) - see docs/backend-dependencies.md.
 * Quantities are whole units of the SKU.
 */
export interface InventoryItem {
  variantId: string;
  sku: string;
  productId: string;
  productTitle: string;
  /** Human label of the variant options, e.g. "سایز: ۹۰×۲۰۰". */
  variantLabel?: string | null;
  onHand: number;
  reserved: number;
  /** Server-computed sellable quantity (onHand - reserved); never recomputed as truth in the UI. */
  available: number;
  lowStockThreshold?: number | null;
  updatedAt?: string;
}

export type AdjustmentReason = 'received' | 'correction' | 'damaged' | 'returned' | 'other';

export const REASON_LABELS: Record<AdjustmentReason, string> = {
  received: 'ورود کالا به انبار',
  correction: 'اصلاح شمارش',
  damaged: 'خرابی / ضایعات',
  returned: 'مرجوعی',
  other: 'سایر (توضیح لازم است)',
};

export interface AdjustmentRequest {
  variantId: string;
  /** Signed, non-zero. Positive adds stock, negative removes it. */
  delta: number;
  reasonCode: AdjustmentReason;
  note?: string;
}

export interface InventoryListQuery {
  page: number;
  pageSize: number;
  search?: string;
  lowStock?: boolean;
  [key: string]: string | number | boolean | undefined;
}
