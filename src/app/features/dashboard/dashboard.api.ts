import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { DashboardRange, DashboardSummary } from './dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly api = inject(ApiClient);

  summary(range: DashboardRange): Observable<DashboardSummary> {
    return this.api.get<DashboardSummary>('/admin/dashboard/summary', { range });
  }
}
