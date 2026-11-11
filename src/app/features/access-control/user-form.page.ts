import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { AuthStore } from '../../core/auth/auth.store';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { applyFieldErrors } from '../../shared/forms/apply-field-errors';
import { FormFieldComponent } from '../../shared/forms/form-field';
import { ButtonComponent } from '../../shared/ui/button';
import { normalizeDigits } from '../../shared/utilities/digits';
import { AccessApi } from './access.api';
import { AdminRole, AdminUserDetail, CreateUserRequest, UpdateUserRequest } from './access.models';

const MOBILE = /^09\d{9}$/;

/** Accepts Persian/Arabic digits too (they are normalised before sending). Empty is allowed. */
function mobileValidator(control: AbstractControl): ValidationErrors | null {
  const v = normalizeDigits(String(control.value ?? '')).trim();
  return v === '' || MOBILE.test(v) ? null : { pattern: true };
}

/** At least one contact channel (email or mobile) is required. */
function contactRequired(group: AbstractControl): ValidationErrors | null {
  const email = (group.get('email')?.value as string | undefined)?.trim();
  const mobile = (group.get('mobile')?.value as string | undefined)?.trim();
  return email || mobile ? null : { contact: true };
}

@Component({
  selector: 'app-user-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FormFieldComponent, ButtonComponent],
  template: `
    <header class="mb-4 flex items-center gap-3">
      <a
        routerLink="/access/users"
        class="text-muted no-underline hover:text-foreground"
        aria-label="بازگشت به فهرست"
        >→</a
      >
      <h1 class="m-0">{{ isEdit() ? 'ویرایش کاربر' : 'کاربر جدید' }}</h1>
    </header>

    @if (loadError(); as err) {
      <p class="rounded-md bg-danger-soft p-4 text-sm text-danger" role="alert">{{ err }}</p>
    } @else {
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
        class="max-w-2xl rounded-lg border border-border bg-surface p-6 shadow-card"
      >
        @if (summaryError(); as s) {
          <p class="mb-4 rounded-md bg-danger-soft p-3 text-sm text-danger" role="alert">{{ s }}</p>
        }
        @if (form.errors?.['contact'] && form.touched) {
          <p class="mb-4 rounded-md bg-warning-soft p-3 text-sm text-warning" role="alert">
            حداقل یکی از ایمیل یا موبایل را وارد کنید.
          </p>
        }

        <app-form-field
          label="نام نمایشی"
          for="displayName"
          [control]="form.controls.displayName"
          [required]="true"
        >
          <input
            id="displayName"
            formControlName="displayName"
            autocomplete="off"
            class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </app-form-field>

        <div class="grid gap-x-4 sm:grid-cols-2">
          <app-form-field label="ایمیل" for="email" [control]="form.controls.email">
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="off"
              class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </app-form-field>
          <app-form-field
            label="موبایل"
            for="mobile"
            [control]="form.controls.mobile"
            hint="مثال: 09123456789"
          >
            <input
              id="mobile"
              inputmode="numeric"
              formControlName="mobile"
              autocomplete="off"
              class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </app-form-field>
        </div>

        @if (!isEdit()) {
          <app-form-field
            label="رمز عبور اولیه"
            for="password"
            [control]="form.controls.password"
            [required]="true"
            hint="حداقل ۱۰ کاراکتر. کاربر باید پس از اولین ورود آن را تغییر دهد."
          >
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="new-password"
              class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </app-form-field>
        }

        @if (canAssign()) {
          <fieldset class="mb-4 rounded-md border border-border p-3">
            <legend class="px-1 text-sm font-medium">نقش‌ها</legend>
            @if (roles().length === 0) {
              <p class="m-0 text-sm text-muted">نقشی تعریف نشده است.</p>
            }
            @for (r of roles(); track r.id) {
              <label class="flex cursor-pointer items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  [checked]="selectedRoleIds().includes(r.id)"
                  (change)="toggleRole(r.id)"
                  [disabled]="form.disabled"
                />
                <span>{{ r.name }}</span>
                @if (r.description) {
                  <span class="text-xs text-muted">- {{ r.description }}</span>
                }
              </label>
            }
          </fieldset>
        }

        @if (detail(); as d) {
          <section class="mb-5" aria-labelledby="eff-title">
            <h3 id="eff-title" class="mb-2 mt-0">مجوزهای مؤثر</h3>
            @if (d.effectivePermissions.length === 0) {
              <p class="m-0 text-sm text-muted">این کاربر مجوزی ندارد.</p>
            } @else {
              <ul class="m-0 flex list-none flex-wrap gap-1.5 p-0">
                @for (p of d.effectivePermissions; track p) {
                  <li class="ltr-field rounded bg-surface-muted px-2 py-0.5 text-xs">{{ p }}</li>
                }
              </ul>
            }
          </section>
        }

        <div class="flex gap-2">
          @if (canSave()) {
            <button app-button type="submit" [loading]="saving()">
              {{ isEdit() ? 'ذخیره تغییرات' : 'ایجاد کاربر' }}
            </button>
          }
          <a
            routerLink="/access/users"
            class="inline-flex h-10 items-center rounded-md px-4 text-sm text-foreground no-underline hover:bg-surface-muted"
            >بازگشت</a
          >
        </div>
      </form>
    }
  `,
})
export class UserFormPage {
  /** Bound from the `:id` route param (withComponentInputBinding). Undefined => create mode. */
  readonly id = input<string>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AccessApi);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly detail = signal<AdminUserDetail | null>(null);
  protected readonly roles = signal<AdminRole[]>([]);
  protected readonly selectedRoleIds = signal<string[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly summaryError = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly canAssign = computed(() =>
    this.store.can({ all: [Permissions.RolesRead, Permissions.RolesAssign] }),
  );
  protected readonly canSave = computed(() =>
    this.store.can({ all: [this.isEdit() ? Permissions.UsersUpdate : Permissions.UsersCreate] }),
  );

  protected readonly form = this.fb.nonNullable.group(
    {
      displayName: ['', [Validators.required, Validators.maxLength(120)]],
      email: ['', [Validators.email, Validators.maxLength(254)]],
      mobile: ['', [mobileValidator]],
      password: [''],
    },
    { validators: contactRequired },
  );

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) {
        this.form.controls.password.clearValidators();
        this.loadUser(id);
      } else {
        this.form.controls.password.setValidators([Validators.required, Validators.minLength(10)]);
      }
      this.form.controls.password.updateValueAndValidity();
      if (!this.canSave()) this.form.disable();
      if (this.canAssign()) this.loadRoles();
    });
  }

  private loadUser(id: string): void {
    this.api.user(id).subscribe({
      next: (u) => {
        this.detail.set(u);
        this.selectedRoleIds.set(u.roles.map((r) => r.id));
        this.form.patchValue({
          displayName: u.displayName,
          email: u.email ?? '',
          mobile: u.mobile ?? '',
        });
      },
      error: (e: unknown) => this.loadError.set(ApiError.from(e).message),
    });
  }

  private loadRoles(): void {
    this.api.roles().subscribe({
      next: (page) => this.roles.set(page.data),
      error: () => this.roles.set([]),
    });
  }

  protected toggleRole(roleId: string): void {
    this.selectedRoleIds.update((ids) =>
      ids.includes(roleId) ? ids.filter((i) => i !== roleId) : [...ids, roleId],
    );
  }

  protected submit(): void {
    if (this.saving()) return; // prevents duplicate submits
    this.form.markAllAsTouched();
    this.summaryError.set(null);
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const email = v.email.trim();
    const mobile = normalizeDigits(v.mobile).trim();
    this.saving.set(true);

    const id = this.id();
    const request$ = id
      ? this.api.updateUser(id, this.buildUpdate(v.displayName.trim(), email, mobile))
      : this.api.createUser(this.buildCreate(v.displayName.trim(), email, mobile, v.password));

    request$.subscribe({
      next: () => {
        this.notify.success(id ? 'تغییرات ذخیره شد.' : 'کاربر ایجاد شد.');
        void this.router.navigate(['/access/users']);
      },
      error: (e: unknown) => {
        const err = ApiError.from(e);
        const unmatched = applyFieldErrors(this.form, err.fieldErrors);
        this.summaryError.set(
          unmatched.length > 0 || Object.keys(err.fieldErrors).length === 0 ? err.message : null,
        );
        this.saving.set(false);
      },
    });
  }

  private buildCreate(
    displayName: string,
    email: string,
    mobile: string,
    password: string,
  ): CreateUserRequest {
    return {
      displayName,
      ...(email ? { email } : {}),
      ...(mobile ? { mobile } : {}),
      password,
      roleIds: this.canAssign() ? this.selectedRoleIds() : [],
    };
  }

  private buildUpdate(displayName: string, email: string, mobile: string): UpdateUserRequest {
    return {
      displayName,
      email: email || null,
      mobile: mobile || null,
      // roleIds is sent only when the admin may assign roles; otherwise the server keeps the current ones.
      ...(this.canAssign() ? { roleIds: this.selectedRoleIds() } : {}),
    };
  }
}
