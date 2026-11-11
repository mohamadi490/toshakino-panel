/*
 * ASSUMED wire contract (no OpenAPI yet) - see docs/backend-dependencies.md.
 */
export type PublishStatus = 'draft' | 'published' | 'archived';

export const STATUS_LABELS: Record<PublishStatus, string> = {
  draft: 'پیش‌نویس',
  published: 'منتشرشده',
  archived: 'بایگانی',
};

export interface Category {
  id: string;
  parentId: string | null;
  slug: string;
  title: string;
  description?: string | null;
  status: PublishStatus;
  sortOrder: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  productCount?: number;
}

export interface CategoryWriteRequest {
  parentId: string | null;
  slug: string;
  title: string;
  description: string | null;
  status: PublishStatus;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
}

/* ---------------- Products (ASSUMED contract) ---------------- */
export interface ProductAttribute {
  name: string;
  value: string;
}
export interface VariantOption {
  name: string;
  value: string;
}

export interface ProductVariant {
  id?: string;
  sku: string;
  options: VariantOption[];
  /** Integer Rial on the wire. */
  priceRial: number;
  salePriceRial?: number | null;
  weightGrams?: number | null;
  isActive: boolean;
}

export interface ProductSummary {
  id: string;
  slug: string;
  title: string;
  status: PublishStatus;
  categoryId?: string | null;
  categoryTitle?: string | null;
  minPriceRial?: number | null;
  variantCount: number;
  updatedAt: string;
  publishedAt?: string | null;
}

export interface ProductDetail extends ProductSummary {
  shortDescription?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  attributes: ProductAttribute[];
  variants: ProductVariant[];
}

export interface ProductWriteRequest {
  slug: string;
  title: string;
  categoryId: string | null;
  shortDescription: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  attributes: ProductAttribute[];
  variants: ProductVariant[];
}

export interface ProductListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: PublishStatus;
  categoryId?: string;
  [key: string]: string | number | boolean | undefined;
}
