import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import {
  AttributeCreate,
  AttributeRead,
  AttributeUpdate,
  AttributeValueInput,
  AttributeValueUpdate,
  BrandAdminRead,
  BrandCreate,
  BrandUpdate,
  CategoryCreate,
  CategoryRead,
  CategoryUpdate,
} from '../../core/api/schemas';

/** Categories, brands and attributes (contract tags: admin-categories, admin-brands, admin-attributes). */
@Injectable({ providedIn: 'root' })
export class TaxonomyApi {
  private readonly api = inject(ApiClient);

  // ---- categories: flat list (build the tree with parentId); `deleted=true` lists only deleted ones
  categories(deleted = false): Observable<CategoryRead[]> {
    return this.api.get<CategoryRead[]>(
      '/admin/categories',
      deleted ? { deleted: true } : undefined,
    );
  }
  category(id: number): Observable<CategoryRead> {
    return this.api.get<CategoryRead>(`/admin/categories/${id}`);
  }
  createCategory(body: CategoryCreate): Observable<CategoryRead> {
    return this.api.post<CategoryRead>('/admin/categories', body);
  }
  updateCategory(id: number, body: CategoryUpdate): Observable<CategoryRead> {
    return this.api.patch<CategoryRead>(`/admin/categories/${id}`, body);
  }
  deleteCategory(id: number): Observable<void> {
    return this.api.delete(`/admin/categories/${id}`);
  }
  restoreCategory(id: number): Observable<CategoryRead> {
    return this.api.post<CategoryRead>(`/admin/categories/${id}/restore`);
  }

  // ---- brands
  brands(deleted = false): Observable<BrandAdminRead[]> {
    return this.api.get<BrandAdminRead[]>('/admin/brands', deleted ? { deleted: true } : undefined);
  }
  brand(id: number): Observable<BrandAdminRead> {
    return this.api.get<BrandAdminRead>(`/admin/brands/${id}`);
  }
  createBrand(body: BrandCreate): Observable<BrandAdminRead> {
    return this.api.post<BrandAdminRead>('/admin/brands', body);
  }
  updateBrand(id: number, body: BrandUpdate): Observable<BrandAdminRead> {
    return this.api.patch<BrandAdminRead>(`/admin/brands/${id}`, body);
  }
  deleteBrand(id: number): Observable<void> {
    return this.api.delete(`/admin/brands/${id}`);
  }
  restoreBrand(id: number): Observable<BrandAdminRead> {
    return this.api.post<BrandAdminRead>(`/admin/brands/${id}/restore`);
  }

  // ---- attributes (value operations all answer with the whole attribute)
  attributes(): Observable<AttributeRead[]> {
    return this.api.get<AttributeRead[]>('/admin/attributes');
  }
  attribute(id: number): Observable<AttributeRead> {
    return this.api.get<AttributeRead>(`/admin/attributes/${id}`);
  }
  createAttribute(body: AttributeCreate): Observable<AttributeRead> {
    return this.api.post<AttributeRead>('/admin/attributes', body);
  }
  updateAttribute(id: number, body: AttributeUpdate): Observable<AttributeRead> {
    return this.api.patch<AttributeRead>(`/admin/attributes/${id}`, body);
  }
  deleteAttribute(id: number): Observable<void> {
    return this.api.delete(`/admin/attributes/${id}`);
  }
  addAttributeValue(id: number, body: AttributeValueInput): Observable<AttributeRead> {
    return this.api.post<AttributeRead>(`/admin/attributes/${id}/values`, body);
  }
  updateAttributeValue(
    id: number,
    valueId: number,
    body: AttributeValueUpdate,
  ): Observable<AttributeRead> {
    return this.api.patch<AttributeRead>(`/admin/attributes/${id}/values/${valueId}`, body);
  }
  /** Contract: DELETE answers 200 with the updated attribute (not 204). */
  deleteAttributeValue(id: number, valueId: number): Observable<AttributeRead> {
    return this.api.deleteWithBody<AttributeRead>(`/admin/attributes/${id}/values/${valueId}`);
  }
}
