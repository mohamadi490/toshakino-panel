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
import { AuthStore } from '../../core/auth/auth.store';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { applyFieldErrors } from '../../shared/forms/apply-field-errors';
import { FormFieldComponent } from '../../shared/forms/form-field';
import { slugValidator } from '../../shared/forms/validators';
import { ButtonComponent } from '../../shared/ui/button';
import { CatalogApi } from './catalog.api';
import { Category, CategoryWriteRequest, PublishStatus, STATUS_LABELS } from './catalog.models';
import { flattenCategoryTree, selfAndDescendantIds } from './category-tree';

const blankToNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());

@Component({
  selector: 'app-category-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FormFieldComponent, ButtonComponent],
  template: `
    <header class="mb-4 flex items-center gap-3">
      <a
        routerLink="/catalog/categories"
        class="text-muted no-underline hover:text-foreground"
        aria-label="بازگشت به فهرست"
        >→</a
      >
      <h1 class="m-0">{{ isEdit() ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید' }}</h1>
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

        <app-form-field label="عنوان" for="title" [control]="form.controls.title" [required]="true">
          <input
            id="title"
            formControlName="title"
            class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </app-form-field>

        <app-form-field
          label="اسلاگ (بخشی از آدرس)"
          for="slug"
          [control]="form.controls.slug"
          [required]="true"
          [hint]="
            isEdit()
              ? 'تغییر اسلاگ باعث ثبت ریدایرکت دائمی از آدرس قبلی می‌شود.'
              : 'حروف کوچک انگلیسی، عدد و خط تیره.'
          "
        >
          <input
            id="slug"
            formControlName="slug"
            autocomplete="off"
            class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </app-form-field>

        <div class="grid gap-x-4 sm:grid-cols-2">
          <app-form-field label="دسته والد" for="parentId" [control]="form.controls.parentId">
            <select
              id="parentId"
              formControlName="parentId"
              class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">— بدون والد (دسته اصلی) —</option>
              @for (o of parentOptions(); track o.id) {
                <option [value]="o.id">{{ '— '.repeat(o.depth) }}{{ o.title }}</option>
              }
            </select>
          </app-form-field>
          <app-form-field label="وضعیت" for="status" [control]="form.controls.status">
            <select
              id="status"
              formControlName="status"
              class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              @for (s of statuses; track s.value) {
                <option [value]="s.value">{{ s.label }}</option>
              }
            </select>
          </app-form-field>
        </div>

        <app-form-field
          label="ترتیب نمایش"
          for="sortOrder"
          [control]="form.controls.sortOrder"
          hint="عدد کوچک‌تر، بالاتر نمایش داده می‌شود."
        >
          <input
            id="sortOrder"
            type="number"
            formControlName="sortOrder"
            class="ltr-field h-10 w-40 rounded-md border border-border bg-background px-3 text-sm"
          />
        </app-form-field>

        <app-form-field label="توضیحات" for="description" [control]="form.controls.description">
          <textarea
            id="description"
            formControlName="description"
            rows="3"
            class="w-full rounded-md border border-border bg-background p-3 text-sm"
          ></textarea>
        </app-form-field>

        <h3 class="mb-2 mt-4">سئو</h3>
        <app-form-field
          label="عنوان سئو"
          for="seoTitle"
          [control]="form.controls.seoTitle"
          hint="پیشنهاد: حداکثر ۷۰ کاراکتر"
        >
          <input
            id="seoTitle"
            formControlName="seoTitle"
            class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </app-form-field>
        <app-form-field
          label="توضیحات سئو"
          for="seoDescription"
          [control]="form.controls.seoDescription"
          hint="پیشنهاد: حداکثر ۱۶۰ کاراکتر"
        >
          <textarea
            id="seoDescription"
            formControlName="seoDescription"
            rows="2"
            class="w-full rounded-md border border-border bg-background p-3 text-sm"
          ></textarea>
        </app-form-field>
        <app-form-field
          label="Canonical URL"
          for="canonicalUrl"
          [control]="form.controls.canonicalUrl"
          hint="اختیاری؛ فقط آدرس کامل https"
        >
          <input
            id="canonicalUrl"
            formControlName="canonicalUrl"
            class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </app-form-field>

        <div class="mt-2 flex gap-2">
          @if (canSave()) {
            <button app-button type="submit" [loading]="saving()">
              {{ isEdit() ? 'ذخیره تغییرات' : 'ایجاد دسته‌بندی' }}
            </button>
          }
          <a
            routerLink="/catalog/categories"
            class="inline-flex h-10 items-center rounded-md px-4 text-sm text-foreground no-underline hover:bg-surface-muted"
            >بازگشت</a
          >
        </div>
      </form>
    }
  `,
})
export class CategoryFormPage {
  readonly id = input<string>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CatalogApi);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly categories = signal<Category[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly summaryError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly statuses = (Object.keys(STATUS_LABELS) as PublishStatus[]).map((value) => ({
    value,
    label: STATUS_LABELS[value],
  }));

  protected readonly canSave = computed(() =>
    this.store.can({ all: [Permissions.CategoriesManage] }),
  );

  /** A category cannot become its own parent or move under one of its descendants. */
  protected readonly parentOptions = computed(() => {
    const id = this.id();
    const blocked = id ? selfAndDescendantIds(this.categories(), id) : new Set<string>();
    return flattenCategoryTree(this.categories())
      .filter((n) => !blocked.has(n.category.id))
      .map((n) => ({ id: n.category.id, title: n.category.title, depth: n.depth }));
  });

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    slug: ['', [Validators.required, Validators.maxLength(120), slugValidator]],
    parentId: [''],
    status: ['draft' as PublishStatus],
    sortOrder: [0, [Validators.required, Validators.min(0), Validators.max(100000)]],
    description: ['', [Validators.maxLength(2000)]],
    seoTitle: ['', [Validators.maxLength(120)]],
    seoDescription: ['', [Validators.maxLength(300)]],
    canonicalUrl: ['', [Validators.pattern(/^$|^https:\/\/\S+$/), Validators.maxLength(500)]],
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.api.categories().subscribe({
        next: (page) => {
          this.categories.set(page.data);
          if (!id) return;
          const found = page.data.find((c) => c.id === id);
          if (!found) {
            this.loadError.set('دسته‌بندی مورد نظر پیدا نشد.');
            return;
          }
          this.form.patchValue({
            title: found.title,
            slug: found.slug,
            parentId: found.parentId ?? '',
            status: found.status,
            sortOrder: found.sortOrder,
            description: found.description ?? '',
            seoTitle: found.seoTitle ?? '',
            seoDescription: found.seoDescription ?? '',
            canonicalUrl: found.canonicalUrl ?? '',
          });
        },
        error: (e: unknown) => this.loadError.set(ApiError.from(e).message),
      });
      if (!this.canSave()) this.form.disable();
    });
  }

  protected submit(): void {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    this.summaryError.set(null);
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const body: CategoryWriteRequest = {
      parentId: v.parentId === '' ? null : v.parentId,
      slug: v.slug.trim(),
      title: v.title.trim(),
      description: blankToNull(v.description),
      status: v.status,
      sortOrder: Number(v.sortOrder),
      seoTitle: blankToNull(v.seoTitle),
      seoDescription: blankToNull(v.seoDescription),
      canonicalUrl: blankToNull(v.canonicalUrl),
    };
    const id = this.id();
    this.saving.set(true);
    (id ? this.api.updateCategory(id, body) : this.api.createCategory(body)).subscribe({
      next: () => {
        this.notify.success(id ? 'تغییرات ذخیره شد.' : 'دسته‌بندی ایجاد شد.');
        void this.router.navigate(['/catalog/categories']);
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
}
