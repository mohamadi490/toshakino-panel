import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { ApiPage } from '../../core/api/api-types';
import { Category, CategoryWriteRequest } from './catalog.models';

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly api = inject(ApiClient);

  /** The agreed contract has no GET by id, so forms read from this (non-paginated-in-practice) list. */
  categories(): Observable<ApiPage<Category>> {
    return this.api.getPage<Category>('/admin/categories', { page: 1, pageSize: 500 });
  }
  createCategory(body: CategoryWriteRequest): Observable<Category> {
    return this.api.post<Category>('/admin/categories', body);
  }
  updateCategory(id: string, body: Partial<CategoryWriteRequest>): Observable<Category> {
    return this.api.patch<Category>(`/admin/categories/${encodeURIComponent(id)}`, body);
  }
}
