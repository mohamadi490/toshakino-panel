import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { PermissionRead, RoleCreate, RoleRead, RoleUpdate } from '../../core/api/schemas';
import { AuthStore } from '../../core/auth/auth.store';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { applyFieldErrors } from '../../shared/forms/apply-field-errors';
import { FormFieldComponent } from '../../shared/forms/form-field';
import { ButtonComponent } from '../../shared/ui/button';
import { AccessApi } from './access.api';
import { groupPermissions } from './access.models';

@Component({
  selector: 'app-role-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FormFieldComponent, ButtonComponent],
  template: `
    <header class="mb-4 flex items-center gap-3">
      <a
        routerLink="/access/roles"
        class="text-muted no-underline hover:text-foreground"
        aria-label="بازگشت به فهرست"
        >→</a
      >
      <h1 class="m-0">{{ isEdit() ? 'ویرایش نقش' : 'نقش جدید' }}</h1>
    </header>

    @if (loadError(); as err) {
      <p class="rounded-md bg-danger-soft p-4 text-sm text-danger" role="alert">{{ err }}</p>
    } @else {
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
        class="max-w-3xl rounded-lg border border-border bg-surface p-6 shadow-card"
      >
        @if (summaryError(); as s) {
          <p class="mb-4 rounded-md bg-danger-soft p-3 text-sm text-danger" role="alert">{{ s }}</p>
        }
        @if (role()?.isSystem) {
          <p class="mb-4 rounded-md bg-info-soft p-3 text-sm text-info" role="status">
            این یک نقش سیستمی است؛ ممکن است سرور تغییر آن را نپذیرد.
          </p>
        }

        <app-form-field label="نام نقش" for="name" [control]="form.controls.name" [required]="true">
          <input
            id="name"
            formControlName="name"
            class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </app-form-field>
        <app-form-field label="توضیحات" for="description" [control]="form.controls.description">
          <textarea
            id="description"
            formControlName="description"
            rows="2"
            class="w-full rounded-md border border-border bg-background p-3 text-sm"
          ></textarea>
        </app-form-field>
        <label class="mb-4 flex cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" class="mt-1.5" formControlName="isStaff" />
          <span
            >نقش کارمندی (اجازه ورود به پنل مدیریت)
            <span class="block text-xs text-muted"
              >برای نقش مشتری این گزینه را خاموش کنید.</span
            ></span
          >
        </label>

        <h3 class="mb-2 mt-2">مجوزها</h3>
        @for (g of groups(); track g.group) {
          <fieldset class="mb-3 rounded-md border border-border p-3">
            <legend class="px-1 text-sm font-medium">{{ g.group }}</legend>
            <label class="mb-1 flex cursor-pointer items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                [checked]="allSelected(g.items)"
                [disabled]="form.disabled"
                (change)="toggleGroup(g.items)"
              />
              انتخاب همه
            </label>
            <div class="grid gap-1 sm:grid-cols-2">
              @for (p of g.items; track p.code) {
                <label class="flex cursor-pointer items-start gap-2 py-0.5 text-sm">
                  <input
                    type="checkbox"
                    class="mt-1.5"
                    [checked]="selected().has(p.code)"
                    [disabled]="form.disabled"
                    (change)="toggle(p.code)"
                  />
                  <span
                    >{{ p.description
                    }}<span class="ltr-field block text-xs text-muted">{{ p.code }}</span></span
                  >
                </label>
              }
            </div>
          </fieldset>
        } @empty {
          <p class="text-sm text-muted">فهرست مجوزها بارگذاری نشد.</p>
        }

        <div class="mt-4 flex gap-2">
          @if (canSave()) {
            <button app-button type="submit" [loading]="saving()">
              {{ isEdit() ? 'ذخیره تغییرات' : 'ایجاد نقش' }}
            </button>
          }
          <a
            routerLink="/access/roles"
            class="inline-flex h-10 items-center rounded-md px-4 text-sm text-foreground no-underline hover:bg-surface-muted"
            >بازگشت</a
          >
        </div>
      </form>
    }
  `,
})
export class RoleFormPage {
  readonly id = input<string>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AccessApi);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly role = signal<RoleRead | null>(null);
  protected readonly catalog = signal<PermissionRead[]>([]);
  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly loadError = signal<string | null>(null);
  protected readonly summaryError = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly canSave = computed(() =>
    this.store.can({ all: [this.isEdit() ? Permissions.RolesUpdate : Permissions.RolesCreate] }),
  );
  protected readonly groups = computed(() => groupPermissions(this.catalog()));

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    description: ['', [Validators.maxLength(255)]],
    isStaff: [true],
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.api.permissions().subscribe({
        next: (p) => this.catalog.set(p),
        error: (e: unknown) => this.loadError.set(ApiError.from(e).message),
      });
      if (id) this.loadRole(Number(id));
      if (!this.canSave()) this.form.disable();
    });
  }

  /** The contract has no GET /admin/roles/{id}: the role is taken from the (complete) list. */
  private loadRole(id: number): void {
    this.api.roles().subscribe({
      next: (list) => {
        const found = list.find((r) => r.id === id);
        if (!found) {
          this.loadError.set('نقش مورد نظر پیدا نشد.');
          return;
        }
        this.role.set(found);
        this.selected.set(new Set(found.permissions));
        this.form.patchValue({
          name: found.name,
          description: found.description ?? '',
          isStaff: found.isStaff,
        });
      },
      error: (e: unknown) => this.loadError.set(ApiError.from(e).message),
    });
  }

  protected toggle(code: string): void {
    this.selected.update((s) => {
      const n = new Set(s);
      if (n.has(code)) n.delete(code);
      else n.add(code);
      return n;
    });
  }

  protected allSelected(items: readonly PermissionRead[]): boolean {
    return items.length > 0 && items.every((p) => this.selected().has(p.code));
  }

  protected toggleGroup(items: readonly PermissionRead[]): void {
    const all = this.allSelected(items);
    this.selected.update((s) => {
      const n = new Set(s);
      items.forEach((p) => (all ? n.delete(p.code) : n.add(p.code)));
      return n;
    });
  }

  protected submit(): void {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    this.summaryError.set(null);
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const name = v.name.trim();
    const description = v.description.trim();
    const permissions = [...this.selected()].sort();
    const id = this.id();

    let request;
    if (id) {
      const body = this.diff(name, description, v.isStaff, permissions);
      if (body === null) {
        this.notify.info('تغییری برای ذخیره وجود ندارد.');
        return;
      }
      request = this.api.updateRole(Number(id), body);
    } else {
      const body: RoleCreate = {
        name,
        ...(description ? { description } : {}),
        permissions,
        isStaff: v.isStaff,
      };
      request = this.api.createRole(body);
    }

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.notify.success(id ? 'نقش ذخیره شد.' : 'نقش ایجاد شد.');
        void this.router.navigate(['/access/roles']);
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

  /** Only changed fields; clearing the description sends an explicit null (Q12). */
  private diff(
    name: string,
    description: string,
    isStaff: boolean,
    permissions: string[],
  ): RoleUpdate | null {
    const r = this.role();
    if (!r) return null;
    const body: RoleUpdate = {};
    if (name !== r.name) body.name = name;
    if (description !== (r.description ?? ''))
      body.description = description === '' ? null : description;
    if (isStaff !== r.isStaff) body.isStaff = isStaff;
    if (JSON.stringify(permissions) !== JSON.stringify([...r.permissions].sort()))
      body.permissions = permissions;
    return Object.keys(body).length > 0 ? body : null;
  }
}
