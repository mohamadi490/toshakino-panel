import { AttributeRead, BrandAdminRead, CategoryRead } from '../../core/api/schemas';

export const category = (id: number, over: Partial<CategoryRead> = {}): CategoryRead => ({
  id,
  parentId: null,
  name: `دسته ${id}`,
  slug: `cat-${id}`,
  description: null,
  imageUrl: null,
  imageAlt: null,
  position: 0,
  status: 'published',
  seoTitle: null,
  seoDescription: null,
  canonicalUrl: null,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});

export const brand = (id: number, over: Partial<BrandAdminRead> = {}): BrandAdminRead => ({
  id,
  name: `برند ${id}`,
  slug: `brand-${id}`,
  description: null,
  logoUrl: null,
  logoAlt: null,
  seoTitle: null,
  seoDescription: null,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});

export const attribute = (id: number, over: Partial<AttributeRead> = {}): AttributeRead => ({
  id,
  name: `ویژگی ${id}`,
  position: 0,
  values: [
    { id: id * 10 + 1, value: 'الف', position: 0 },
    { id: id * 10 + 2, value: 'ب', position: 1 },
  ],
  ...over,
});
