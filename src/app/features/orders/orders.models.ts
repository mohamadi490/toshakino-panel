/*
 * ASSUMED wire contract (no OpenAPI yet) - see docs/backend-dependencies.md.
 * Statuses are open strings: the backend owns the state machine and the UI only
 * labels the keys it knows; unknown keys are shown raw instead of breaking.
 */
export type StatusKey = string;

export interface OrderSummary {
  id: string;
  number: string;
  customerName?: string | null;
  status: StatusKey;
  paymentStatus: StatusKey;
  shippingStatus?: StatusKey | null;
  itemCount: number;
  totalRial: number;
  createdAt: string;
}

export interface OrderItem {
  variantId?: string;
  sku: string;
  title: string;
  optionsLabel?: string | null;
  quantity: number;
  unitPriceRial: number;
  discountRial: number;
  lineTotalRial: number;
}

export interface OrderAddress {
  recipient?: string | null;
  phone?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  postalCode?: string | null;
}

export interface OrderPayment {
  id: string;
  status: StatusKey;
  amountRial: number;
  gateway?: string | null;
  referenceId?: string | null;
  createdAt: string;
}

export interface OrderTransition {
  from?: StatusKey | null;
  to: StatusKey;
  actor?: string | null;
  note?: string | null;
  at: string;
}

export interface OrderDetail extends OrderSummary {
  customer?: {
    id?: string;
    name?: string | null;
    mobile?: string | null;
    email?: string | null;
  } | null;
  shippingAddress?: OrderAddress | null;
  shippingMethod?: string | null;
  items: OrderItem[];
  subtotalRial: number;
  discountRial: number;
  shippingRial: number;
  payments: OrderPayment[];
  history: OrderTransition[];
  /** Server-decided next statuses. The UI offers exactly these and nothing else. */
  allowedTransitions: StatusKey[];
}

export interface StatusChangeRequest {
  status: StatusKey;
  note?: string;
}

export interface OrderListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: StatusKey;
  paymentStatus?: StatusKey;
  sort?: string;
  [key: string]: string | number | boolean | undefined;
}
