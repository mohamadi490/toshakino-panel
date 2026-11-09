import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthStore } from '../../core/auth/auth.store';

@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mt-0">سلام {{ store.user()?.displayName }}</h1>
    <p class="text-muted">
      پایه پنل آماده است. بخش‌های مدیریت محصول، سفارش و مشتری در فاز بعد اضافه می‌شوند.
    </p>
  `,
})
export class DashboardPage {
  protected readonly store = inject(AuthStore);
}
