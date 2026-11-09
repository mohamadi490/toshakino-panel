import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppearanceToggleComponent } from '../chrome/appearance-toggle';

@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, AppearanceToggleComponent],
  template: `
    <main class="grid min-h-dvh place-items-center bg-background p-4">
      <div class="absolute end-4 top-4"><app-appearance-toggle /></div>
      <div class="w-full max-w-sm">
        <div class="mb-6 text-center">
          <p class="m-0 text-2xl font-bold text-primary">تشکینو</p>
          <p class="m-0 text-sm text-muted">پنل مدیریت</p>
        </div>
        <router-outlet />
      </div>
    </main>
  `,
})
export class AuthLayoutComponent {}
