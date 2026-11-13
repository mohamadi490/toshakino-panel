import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { ApiPage } from '../../core/api/api-types';
import {
  CustomerDetail,
  CustomerListQuery,
  CustomerOrder,
  CustomerSummary,
} from './customers.models';

@Injectable({ providedIn: 'root' })
export class CustomersApi {
  private readonly api = inject(ApiClient);

  list(query: CustomerListQuery): Observable<ApiPage<CustomerSummary>> {
    return this.api.getPage<CustomerSummary>('/admin/customers', query);
  }
  get(id: string): Observable<CustomerDetail> {
    return this.api.get<CustomerDetail>(`/admin/customers/${encodeURIComponent(id)}`);
  }
  /** Uses the agreed orders endpoint with a `customerId` filter (needs `orders.read`). */
  orders(customerId: string, page: number): Observable<ApiPage<CustomerOrder>> {
    return this.api.getPage<CustomerOrder>('/admin/orders', {
      customerId,
      page,
      pageSize: 10,
      sort: '-createdAt',
    });
  }
}
