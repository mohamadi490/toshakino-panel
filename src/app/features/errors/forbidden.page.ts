import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-md py-16 text-center">
      <p class="m-0 text-5xl font-bold text-muted">۴۰۳</p>
      <h1 class="mb-2">دسترسی غیرمجاز</h1>
      <p class="text-muted">
        برای دیدن این بخش مجوز لازم را ندارید. در صورت نیاز با مدیر سیستم تماس بگیرید.
      </p>
      <a routerLink="/dashboard" class="text-primary">بازگشت به داشبورد</a>
    </section>
  `,
})
export class ForbiddenPage {}
