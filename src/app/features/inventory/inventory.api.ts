import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { ApiPage } from '../../core/api/api-types';
import { AdjustmentRequest, InventoryItem, InventoryListQuery } from './inventory.models';

@Injectable({ providedIn: 'root' })
export class InventoryApi {
  private readonly api = inject(ApiClient);

  list(query: InventoryListQuery): Observable<ApiPage<InventoryItem>> {
    return this.api.getPage<InventoryItem>('/admin/inventory', query);
  }

  /** The Idempotency-Key makes a retried/double-sent adjustment apply at most once. */
  adjust(body: AdjustmentRequest, idempotencyKey: string): Observable<InventoryItem> {
    return this.api.post<InventoryItem>('/admin/inventory/adjustments', body, {
      'Idempotency-Key': idempotencyKey,
    });
  }
}
