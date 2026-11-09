import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { BrandService } from '../../core/brand/brand.service';
import { ButtonComponent } from '../../shared/ui/button';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent],
  template: `
    <form
      class="rounded-lg border border-border bg-surface p-6 shadow-card"
      [formGroup]="form"
      (ngSubmit)="submit()"
      novalidate
    >
      <h1 class="mb-1 mt-0">ورود به پنل</h1>
      <p class="mb-5 mt-0 text-sm text-muted">با حساب مدیریتی خود وارد شوید.</p>

      @if (expired()) {
        <p class="mb-4 rounded-md bg-warning-soft p-3 text-sm text-warning" role="status">
          نشست شما منقضی شده است. دوباره وارد شوید.
        </p>
      }
      @if (error(); as e) {
        <p class="mb-4 rounded-md bg-danger-soft p-3 text-sm text-danger" role="alert">{{ e }}</p>
      }

      <div class="mb-4">
        <label for="identifier" class="mb-1 block text-sm font-medium">ایمیل یا موبایل</label>
        <input
          id="identifier"
          type="text"
          formControlName="identifier"
          autocomplete="username"
          inputmode="email"
          class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          [attr.aria-invalid]="invalid('identifier')"
          aria-describedby="identifier-err"
        />
        <p id="identifier-err" class="m-0 mt-1 min-h-5 text-xs text-danger">
          {{ invalid('identifier') ? 'این فیلد الزامی است.' : '' }}
        </p>
      </div>

      <div class="mb-5">
        <label for="password" class="mb-1 block text-sm font-medium">رمز عبور</label>
        <input
          id="password"
          type="password"
          formControlName="password"
          autocomplete="current-password"
          class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          [attr.aria-invalid]="invalid('password')"
          aria-describedby="password-err"
        />
        <p id="password-err" class="m-0 mt-1 min-h-5 text-xs text-danger">
          {{ invalid('password') ? 'رمز عبور الزامی است.' : '' }}
        </p>
      </div>

      <button app-button type="submit" class="w-full" [loading]="loading()">ورود</button>
    </form>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly brand = inject(BrandService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly expired = signal(
    this.route.snapshot.queryParamMap.get('reason') === 'expired',
  );

  protected readonly form = this.fb.nonNullable.group({
    identifier: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  protected invalid(name: 'identifier' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.brand.load().subscribe();
        const target = this.safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
        void this.router.navigateByUrl(target);
      },
      error: (e: unknown) => {
        const err = ApiError.from(e);
        // Never reveal whether the account exists.
        this.error.set(
          err.kind === 'unauthenticated' || err.kind === 'validation'
            ? 'اطلاعات ورود صحیح نیست.'
            : err.message,
        );
        this.form.controls.password.reset('');
        this.loading.set(false);
      },
    });
  }

  /** Only same-app relative paths are accepted (open-redirect protection). */
  private safeReturnUrl(url: string | null): string {
    return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login')
      ? url
      : '/dashboard';
  }
}
