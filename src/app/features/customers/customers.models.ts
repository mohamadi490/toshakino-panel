/*
 * ASSUMED wire contract (no OpenAPI yet) - see docs/backend-dependencies.md.
 * The backend decides which contact fields it returns for the caller; the UI shows what it gets.
 */
export interface CustomerSummary {
  id: string;
  name: string;
  mobile?: string | null;
  email?: string | null;
  ordersCount: number;
  totalSpentRial?: number | null;
  lastOrderAt?: string | null;
  createdAt: string;
  isActive?: boolean;
}

export interface CustomerAddress {
  id?: string;
  title?: string | null;
  recipient?: string | null;
  phone?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  postalCode?: string | null;
}

export interface CustomerDetail extends CustomerSummary {
  addresses: CustomerAddress[];
}

/** Compact order row shown in the customer's history (full order lives in the orders feature). */
export interface CustomerOrder {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  totalRial: number;
  createdAt: string;
}

export interface CustomerListQuery {
  page: number;
  pageSize: number;
  search?: string;
  sort?: string;
  [key: string]: string | number | boolean | undefined;
}
