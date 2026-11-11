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
