import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { ApiPage } from '../../core/api/api-types';
import { OrderDetail, OrderListQuery, OrderSummary, StatusChangeRequest } from './orders.models';

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly api = inject(ApiClient);

  list(query: OrderListQuery): Observable<ApiPage<OrderSummary>> {
    return this.api.getPage<OrderSummary>('/admin/orders', query);
  }
  get(id: string): Observable<OrderDetail> {
    return this.api.get<OrderDetail>(`/admin/orders/${encodeURIComponent(id)}`);
  }
  /** Idempotency-Key: a retried/double-sent transition is applied at most once. */
  changeStatus(
    id: string,
    body: StatusChangeRequest,
    idempotencyKey: string,
  ): Observable<OrderDetail> {
    return this.api.patchWithHeaders<OrderDetail>(
      `/admin/orders/${encodeURIComponent(id)}/status`,
      body,
      { 'Idempotency-Key': idempotencyKey },
    );
  }
}
