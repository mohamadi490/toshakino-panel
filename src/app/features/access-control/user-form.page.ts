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
import { RoleRead, UserCreate, UserRead, UserUpdate } from '../../core/api/schemas';
import { AuthStore } from '../../core/auth/auth.store';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { applyFieldErrors } from '../../shared/forms/apply-field-errors';
import { FormFieldComponent } from '../../shared/forms/form-field';
import { ButtonComponent } from '../../shared/ui/button';
import { normalizeDigits } from '../../shared/utilities/digits';
import { AccessApi } from './access.api';
import { groupPermissions } from './access.models';

// Patterns copied from the contract (UserCreate).
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,49}$/;
const MOBILE = /^09\d{9}$/;

/** Accepts Persian/Arabic digits too (normalised before sending). Empty is allowed. */
function mobileValidator(c: AbstractControl): ValidationErrors | null {
  const v = normalizeDigits(String(c.value ?? '')).trim();
  return v === '' || MOBILE.test(v) ? null : { pattern: true };
}

/** Create mode: at least one identifier is required. */
function identifierRequired(group: AbstractControl): ValidationErrors | null {
  const has = ['email', 'username', 'mobile'].some(
    (k) => String(group.get(k)?.value ?? '').trim() !== '',
  );
  return has ? null : { contact: true };
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
        @if (!isEdit() && form.errors?.['contact'] && form.touched) {
          <p class="mb-4 rounded-md bg-warning-soft p-3 text-sm text-warning" role="alert">
            حداقل یکی از ایمیل، نام کاربری یا موبایل را وارد کنید.
          </p>
        }
        @if (isSelf()) {
          <p class="mb-4 rounded-md bg-info-soft p-3 text-sm text-info" role="status">
            این حساب خودِ شماست؛ نقش و وضعیت آن را نمی‌توانید تغییر دهید.
          </p>
        }

        <app-form-field label="نام کامل" for="fullName" [control]="form.controls.fullName">
          <input
            id="fullName"
            formControlName="fullName"
            autocomplete="off"
            class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </app-form-field>

        <div class="grid gap-x-4 sm:grid-cols-2">
          <app-form-field
            label="ایمیل"
            for="email"
            [control]="form.controls.email"
            [hint]="isEdit() ? 'قابل ویرایش نیست.' : null"
          >
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="off"
              class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </app-form-field>
          <app-form-field
            label="نام کاربری"
            for="username"
            [control]="form.controls.username"
            [hint]="isEdit() ? 'قابل ویرایش نیست.' : 'حروف کوچک انگلیسی، عدد و . _ -'"
          >
            <input
              id="username"
              formControlName="username"
              autocomplete="off"
              class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </app-form-field>
        </div>
        <app-form-field
          label="موبایل"
          for="mobile"
          [control]="form.controls.mobile"
          [hint]="isEdit() ? 'قابل ویرایش نیست.' : 'مثال: 09123456789'"
        >
          <input
            id="mobile"
            inputmode="numeric"
            formControlName="mobile"
            autocomplete="off"
            class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </app-form-field>

        <app-form-field
          [label]="isEdit() ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'"
          for="password"
          [control]="form.controls.password"
          [required]="!isEdit()"
          hint="۸ تا ۱۲۸ کاراکتر"
        >
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="new-password"
            class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </app-form-field>

        <app-form-field label="نقش" for="roleId" [control]="form.controls.roleId" [required]="true">
          <select
            id="roleId"
            formControlName="roleId"
            class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">انتخاب کنید…</option>
            @for (r of roleOptions(); track r.id) {
              <option [value]="r.id">{{ r.name }} ({{ r.isStaff ? 'کارمند' : 'مشتری' }})</option>
            }
          </select>
        </app-form-field>
        @if (!canListRoles()) {
          <p class="mb-3 mt-0 text-xs text-warning" role="status">
            برای انتخاب نقش به دسترسی مشاهده نقش‌ها نیاز دارید.
          </p>
        }

        @if (isEdit()) {
          <label class="mb-4 flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" formControlName="isActive" /> حساب فعال است
          </label>
        }

        @if (detail(); as d) {
          <section class="mb-5" aria-labelledby="perm-title">
            <h3 id="perm-title" class="mb-2 mt-0">مجوزهای مؤثر</h3>
            @if (d.permissions.length === 0) {
              <p class="m-0 text-sm text-muted">این کاربر مجوزی ندارد.</p>
            } @else {
              @for (g of permissionGroups(); track g.group) {
                <p class="mb-1 mt-2 text-xs font-medium text-muted">{{ g.group }}</p>
                <ul class="m-0 flex list-none flex-wrap gap-1.5 p-0">
                  @for (p of g.items; track p.code) {
                    <li class="ltr-field rounded bg-surface-muted px-2 py-0.5 text-xs">
                      {{ p.code }}
                    </li>
                  }
                </ul>
              }
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
  /** Bound from the `:id` route param. Undefined => create mode. */
  readonly id = input<string>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AccessApi);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly detail = signal<UserRead | null>(null);
  protected readonly roles = signal<RoleRead[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly summaryError = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly canListRoles = computed(() =>
    this.store.can({ all: [Permissions.RolesRead] }),
  );
  protected readonly canSave = computed(() =>
    this.store.can({ all: [this.isEdit() ? Permissions.UsersWrite : Permissions.UsersWrite] }),
  );
  protected readonly isSelf = computed(
    () => this.isEdit() && this.detail()?.id === this.store.user()?.id,
  );
  protected readonly permissionGroups = computed(() =>
    groupPermissions((this.detail()?.permissions ?? []).map((code) => ({ code }))),
  );

  /** Without `roles.read` the select can still show the user's current role. */
  protected readonly roleOptions = computed(() => {
    const list = this.roles();
    const current = this.detail()?.role;
    return current && !list.some((r) => r.id === current.id)
      ? [{ ...current, description: null, isSystem: false, permissions: [] }, ...list]
      : list;
  });

  protected readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.maxLength(120)]],
      email: ['', [Validators.maxLength(255), Validators.pattern(EMAIL)]],
      username: ['', [Validators.pattern(USERNAME)]],
      mobile: ['', [mobileValidator]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      roleId: ['', [Validators.required]],
      isActive: [true],
    },
    { validators: identifierRequired },
  );

  constructor() {
    effect(() => {
      const id = this.id();
      if (this.canListRoles())
        this.api
          .roles()
          .subscribe({ next: (r) => this.roles.set(r), error: () => this.roles.set([]) });
      if (id) {
        // Edit mode: identifiers are immutable in the contract; the password becomes an optional "new password".
        this.form.setValidators(null);
        for (const k of ['email', 'username', 'mobile'] as const) this.form.controls[k].disable();
        this.form.controls.password.setValidators([
          Validators.minLength(8),
          Validators.maxLength(128),
        ]);
        this.form.controls.password.updateValueAndValidity();
        this.loadUser(Number(id));
      }
      if (!this.canSave()) this.form.disable();
    });
  }

  private loadUser(id: number): void {
    this.api.user(id).subscribe({
      next: (u) => {
        this.detail.set(u);
        this.form.patchValue({
          fullName: u.fullName ?? '',
          email: u.email ?? '',
          username: u.username ?? '',
          mobile: u.mobile ?? '',
          roleId: String(u.role.id),
          isActive: u.isActive,
        });
        if (u.id === this.store.user()?.id) {
          this.form.controls.roleId.disable();
          this.form.controls.isActive.disable();
        }
      },
      error: (e: unknown) => this.loadError.set(ApiError.from(e).message),
    });
  }

  protected submit(): void {
    if (this.saving()) return; // prevents duplicate submits
    this.form.markAllAsTouched();
    this.summaryError.set(null);
    if (this.form.invalid) return;

    const id = this.id();
    const body = id ? this.buildUpdate() : this.buildCreate();
    if (body === null) {
      this.notify.info('تغییری برای ذخیره وجود ندارد.');
      return;
    }
    this.saving.set(true);
    (id
      ? this.api.updateUser(Number(id), body as UserUpdate)
      : this.api.createUser(body as UserCreate)
    ).subscribe({
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

  private buildCreate(): UserCreate {
    const v = this.form.getRawValue();
    const fullName = v.fullName.trim();
    const email = v.email.trim();
    const username = v.username.trim();
    const mobile = normalizeDigits(v.mobile).trim();
    return {
      ...(fullName ? { fullName } : {}),
      ...(email ? { email } : {}),
      ...(username ? { username } : {}),
      ...(mobile ? { mobile } : {}),
      password: v.password,
      roleId: Number(v.roleId),
    };
  }

  /** Only changed fields are sent; clearing the name sends an explicit null (see open question Q12). */
  private buildUpdate(): UserUpdate | null {
    const d = this.detail();
    if (!d) return null;
    const v = this.form.getRawValue();
    const body: UserUpdate = {};
    const fullName = v.fullName.trim();
    if (fullName !== (d.fullName ?? '')) body.fullName = fullName === '' ? null : fullName;
    if (!this.form.controls.roleId.disabled && Number(v.roleId) !== d.role.id)
      body.roleId = Number(v.roleId);
    if (!this.form.controls.isActive.disabled && v.isActive !== d.isActive)
      body.isActive = v.isActive;
    if (v.password !== '') body.newPassword = v.password;
    return Object.keys(body).length > 0 ? body : null;
  }
}
