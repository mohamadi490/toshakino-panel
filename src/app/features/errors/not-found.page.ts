import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-md py-16 text-center">
      <p class="m-0 text-5xl font-bold text-muted">۴۰۴</p>
      <h1 class="mb-2">صفحه پیدا نشد</h1>
      <p class="text-muted">آدرس واردشده وجود ندارد یا جابه‌جا شده است.</p>
      <a routerLink="/dashboard" class="text-primary">بازگشت به داشبورد</a>
    </section>
  `,
})
export class NotFoundPage {}
