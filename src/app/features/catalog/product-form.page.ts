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
  FormArray,
  FormBuilder,
  NonNullableFormBuilder,
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
import { slugValidator } from '../../shared/forms/validators';
import { ButtonComponent } from '../../shared/ui/button';
import { IconComponent } from '../../shared/ui/icon';
import { normalizeDigits } from '../../shared/utilities/digits';
import { parseTomanInput, rialToToman, tomanToRial } from '../../shared/utilities/money';
import { CatalogApi } from './catalog.api';
import {
  ProductDetail,
  ProductVariant,
  ProductWriteRequest,
  STATUS_LABELS,
} from './catalog.models';
import { flattenCategoryTree } from './category-tree';

function newAttributeGroup(fb: NonNullableFormBuilder, name = '', value = '') {
  return fb.group({
    name: [name, [Validators.maxLength(80)]],
    value: [value, [Validators.maxLength(300)]],
  });
}
type AttributeGroup = ReturnType<typeof newAttributeGroup>;

const blankToNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());

/** Required Toman amount > 0. */
function priceValidator(c: AbstractControl): ValidationErrors | null {
  const n = parseTomanInput(String(c.value ?? ''));
  return n !== null && n > 0 ? null : { toman: true };
}
/** Optional Toman amount. */
function optionalTomanValidator(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '').trim();
  return v === '' || parseTomanInput(v) !== null ? null : { toman: true };
}
/** Sale price, when given, must be lower than the regular price. */
function saleBelowPrice(group: AbstractControl): ValidationErrors | null {
  const price = parseTomanInput(String(group.get('price')?.value ?? ''));
  const sale = parseTomanInput(String(group.get('salePrice')?.value ?? ''));
  return price !== null && sale !== null && sale >= price ? { saleNotBelowPrice: true } : null;
}
/** SKUs must be unique inside one product (case-insensitive). */
function uniqueSkus(array: AbstractControl): ValidationErrors | null {
  const skus = (array as FormArray).controls
    .map((g) =>
      String(g.get('sku')?.value ?? '')
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
  return new Set(skus).size === skus.length ? null : { duplicateSku: true };
}

@Component({
  selector: 'app-product-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FormFieldComponent, ButtonComponent, IconComponent],
  template: `
    <header class="mb-4 flex flex-wrap items-center gap-3">
      <a
        routerLink="/catalog/products"
        class="text-muted no-underline hover:text-foreground"
        aria-label="بازگشت به فهرست"
        >→</a
      >
      <h1 class="m-0">{{ isEdit() ? 'ویرایش محصول' : 'محصول جدید' }}</h1>
      @if (detail(); as d) {
        <span class="rounded-full bg-surface-muted px-2 py-0.5 text-xs">{{
          statusLabel(d.status)
        }}</span>
        <span class="grow"></span>
        @if (canPublish() && d.status !== 'archived') {
          <button
            app-button
            [variant]="d.status === 'published' ? 'secondary' : 'primary'"
            type="button"
            [loading]="publishing()"
            [disabled]="form.dirty || (d.status !== 'published' && !publishable())"
            (click)="togglePublish()"
          >
            {{ d.status === 'published' ? 'لغو انتشار' : 'انتشار' }}
          </button>
        }
      }
    </header>
    @if (detail(); as d) {
      @if (form.dirty && canPublish()) {
        <p class="mb-3 text-xs text-muted" role="status">
          برای انتشار یا لغو انتشار، ابتدا تغییرات را ذخیره کنید.
        </p>
      } @else if (d.status !== 'published' && !publishable() && canPublish()) {
        <p class="mb-3 text-xs text-warning" role="status">
          برای انتشار حداقل یک Variant فعال با قیمت معتبر لازم است.
        </p>
      }
    }

    @if (loadError(); as err) {
      <p class="rounded-md bg-danger-soft p-4 text-sm text-danger" role="alert">{{ err }}</p>
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="max-w-4xl">
        @if (summaryError(); as s) {
          <p class="mb-4 rounded-md bg-danger-soft p-3 text-sm text-danger" role="alert">{{ s }}</p>
        }
        @if (form.controls.variants.errors?.['duplicateSku'] && form.touched) {
          <p class="mb-4 rounded-md bg-danger-soft p-3 text-sm text-danger" role="alert">
            SKU نباید در یک محصول تکراری باشد.
          </p>
        }

        <section class="mb-4 rounded-lg border border-border bg-surface p-5 shadow-card">
          <h2 class="mb-3 mt-0">اطلاعات اصلی</h2>
          <app-form-field
            label="عنوان"
            for="title"
            [control]="form.controls.title"
            [required]="true"
          >
            <input
              id="title"
              formControlName="title"
              class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </app-form-field>
          <div class="grid gap-x-4 sm:grid-cols-2">
            <app-form-field
              label="اسلاگ"
              for="slug"
              [control]="form.controls.slug"
              [required]="true"
              [hint]="isEdit() ? 'تغییر اسلاگ ریدایرکت دائمی از آدرس قبلی ثبت می‌کند.' : null"
            >
              <input
                id="slug"
                formControlName="slug"
                autocomplete="off"
                class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </app-form-field>
            <app-form-field label="دسته‌بندی" for="categoryId" [control]="form.controls.categoryId">
              <select
                id="categoryId"
                formControlName="categoryId"
                class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">— بدون دسته‌بندی —</option>
                @for (c of categoryOptions(); track c.id) {
                  <option [value]="c.id">{{ '— '.repeat(c.depth) }}{{ c.title }}</option>
                }
              </select>
            </app-form-field>
          </div>
          <app-form-field
            label="توضیح کوتاه"
            for="shortDescription"
            [control]="form.controls.shortDescription"
          >
            <textarea
              id="shortDescription"
              formControlName="shortDescription"
              rows="2"
              class="w-full rounded-md border border-border bg-background p-3 text-sm"
            ></textarea>
          </app-form-field>
          <app-form-field label="توضیحات" for="description" [control]="form.controls.description">
            <textarea
              id="description"
              formControlName="description"
              rows="6"
              class="w-full rounded-md border border-border bg-background p-3 text-sm"
            ></textarea>
          </app-form-field>
        </section>

        <section class="mb-4 rounded-lg border border-border bg-surface p-5 shadow-card">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="m-0">مشخصات فنی</h2>
            @if (!form.disabled) {
              <button app-button variant="ghost" type="button" (click)="addAttribute()">
                <app-icon name="plus" [size]="16" /> افزودن مشخصه
              </button>
            }
          </div>
          @for (a of form.controls.attributes.controls; track a; let i = $index) {
            <div class="mb-2 flex items-start gap-2" [formGroup]="a">
              <input
                [attr.aria-label]="'نام مشخصه ' + (i + 1)"
                formControlName="name"
                placeholder="مثلاً جنس رویه"
                class="h-10 w-1/3 rounded-md border border-border bg-background px-3 text-sm"
              />
              <input
                [attr.aria-label]="'مقدار مشخصه ' + (i + 1)"
                formControlName="value"
                placeholder="مثلاً پارچه ضدحساسیت"
                class="h-10 grow rounded-md border border-border bg-background px-3 text-sm"
              />
              @if (!form.disabled) {
                <button
                  type="button"
                  class="inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-danger"
                  [attr.aria-label]="'حذف مشخصه ' + (i + 1)"
                  (click)="removeAttribute(i)"
                >
                  <app-icon name="trash" [size]="18" />
                </button>
              }
            </div>
          } @empty {
            <p class="m-0 text-sm text-muted">مشخصه‌ای ثبت نشده است.</p>
          }
        </section>

        <section class="mb-4 rounded-lg border border-border bg-surface p-5 shadow-card">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="m-0">Variantها و قیمت</h2>
            @if (!form.disabled) {
              <button app-button variant="ghost" type="button" (click)="addVariant()">
                <app-icon name="plus" [size]="16" /> افزودن Variant
              </button>
            }
          </div>
          <p class="mb-3 mt-0 text-xs text-muted">
            قیمت‌ها را به تومان وارد کنید؛ در سیستم به ریال ذخیره می‌شوند.
          </p>

          @for (v of form.controls.variants.controls; track v; let i = $index) {
            <fieldset class="mb-3 rounded-md border border-border p-3" [formGroup]="v">
              <legend class="px-1 text-sm font-medium">Variant {{ i + 1 }}</legend>
              <div class="grid gap-x-4 sm:grid-cols-3">
                <app-form-field
                  label="SKU"
                  [for]="'sku-' + i"
                  [control]="v.controls.sku"
                  [required]="true"
                >
                  <input
                    [id]="'sku-' + i"
                    formControlName="sku"
                    autocomplete="off"
                    class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </app-form-field>
                <app-form-field
                  label="قیمت (تومان)"
                  [for]="'price-' + i"
                  [control]="v.controls.price"
                  [required]="true"
                >
                  <input
                    [id]="'price-' + i"
                    inputmode="numeric"
                    formControlName="price"
                    class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </app-form-field>
                <app-form-field
                  label="قیمت تخفیفی (تومان)"
                  [for]="'sale-' + i"
                  [control]="v.controls.salePrice"
                >
                  <input
                    [id]="'sale-' + i"
                    inputmode="numeric"
                    formControlName="salePrice"
                    class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </app-form-field>
              </div>
              @if (v.errors?.['saleNotBelowPrice']) {
                <p class="mb-2 mt-0 text-xs text-danger" role="alert">
                  قیمت تخفیفی باید کمتر از قیمت اصلی باشد.
                </p>
              }
              <div class="grid gap-x-4 sm:grid-cols-3">
                <app-form-field
                  label="وزن (گرم)"
                  [for]="'weight-' + i"
                  [control]="v.controls.weightGrams"
                >
                  <input
                    [id]="'weight-' + i"
                    inputmode="numeric"
                    formControlName="weightGrams"
                    class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </app-form-field>
                <label class="flex cursor-pointer items-center gap-2 pt-7 text-sm">
                  <input type="checkbox" formControlName="isActive" /> فعال (قابل فروش)
                </label>
              </div>

              <div class="mt-1">
                <div class="mb-1 flex items-center justify-between">
                  <span class="text-sm text-muted">گزینه‌های انتخابی (مثل سایز)</span>
                  @if (!form.disabled) {
                    <button app-button variant="ghost" type="button" (click)="addOption(v)">
                      <app-icon name="plus" [size]="14" /> گزینه
                    </button>
                  }
                </div>
                @for (o of v.controls.options.controls; track o; let j = $index) {
                  <div class="mb-1 flex gap-2" [formGroup]="o">
                    <input
                      [attr.aria-label]="'نام گزینه ' + (j + 1) + ' از Variant ' + (i + 1)"
                      formControlName="name"
                      placeholder="سایز"
                      class="h-9 w-1/3 rounded-md border border-border bg-background px-3 text-sm"
                    />
                    <input
                      [attr.aria-label]="'مقدار گزینه ' + (j + 1) + ' از Variant ' + (i + 1)"
                      formControlName="value"
                      placeholder="۹۰×۲۰۰"
                      class="h-9 grow rounded-md border border-border bg-background px-3 text-sm"
                    />
                    @if (!form.disabled) {
                      <button
                        type="button"
                        class="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-muted hover:text-danger"
                        [attr.aria-label]="'حذف گزینه ' + (j + 1)"
                        (click)="v.controls.options.removeAt(j)"
                      >
                        <app-icon name="trash" [size]="16" />
                      </button>
                    }
                  </div>
                }
              </div>

              @if (!form.disabled) {
                <button
                  type="button"
                  class="mt-2 cursor-pointer text-xs text-danger underline"
                  (click)="removeVariant(i)"
                >
                  حذف این Variant
                </button>
              }
            </fieldset>
          } @empty {
            <p class="m-0 text-sm text-muted">
              هنوز Variant ای تعریف نشده است. برای فروش محصول حداقل یکی لازم است.
            </p>
          }
        </section>

        <section class="mb-4 rounded-lg border border-border bg-surface p-5 shadow-card">
          <h2 class="mb-3 mt-0">سئو</h2>
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
        </section>

        <div class="flex gap-2">
          @if (canSave()) {
            <button app-button type="submit" [loading]="saving()">
              {{ isEdit() ? 'ذخیره تغییرات' : 'ایجاد محصول' }}
            </button>
          }
          <a
            routerLink="/catalog/products"
            class="inline-flex h-10 items-center rounded-md px-4 text-sm text-foreground no-underline hover:bg-surface-muted"
            >بازگشت</a
          >
        </div>
      </form>
    }
  `,
})
export class ProductFormPage {
  readonly id = input<string>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CatalogApi);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly detail = signal<ProductDetail | null>(null);
  protected readonly categoryOptions = signal<{ id: string; title: string; depth: number }[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly summaryError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly publishing = signal(false);

  protected readonly canSave = computed(() =>
    this.store.can({
      all: [this.isEdit() ? Permissions.ProductsUpdate : Permissions.ProductsCreate],
    }),
  );
  protected readonly canPublish = computed(() =>
    this.store.can({ all: [Permissions.ProductsPublish] }),
  );
  /** UX hint only: the server validates publishability. */
  protected readonly publishable = computed(() => {
    const d = this.detail();
    return !!d && d.variants.some((v) => v.isActive && v.priceRial > 0);
  });

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    slug: ['', [Validators.required, Validators.maxLength(160), slugValidator]],
    categoryId: [''],
    shortDescription: ['', [Validators.maxLength(500)]],
    description: ['', [Validators.maxLength(20000)]],
    seoTitle: ['', [Validators.maxLength(120)]],
    seoDescription: ['', [Validators.maxLength(300)]],
    canonicalUrl: ['', [Validators.pattern(/^$|^https:\/\/\S+$/), Validators.maxLength(500)]],
    attributes: this.fb.array<AttributeGroup>([]),
    variants: this.fb.array<ReturnType<ProductFormPage['variantGroup']>>([], {
      validators: uniqueSkus,
    }),
  });

  constructor() {
    effect(() => {
      const id = this.id();
      if (this.store.can({ all: [Permissions.CategoriesRead] })) {
        this.api.categories().subscribe({
          next: (p) =>
            this.categoryOptions.set(
              flattenCategoryTree(p.data).map((n) => ({
                id: n.category.id,
                title: n.category.title,
                depth: n.depth,
              })),
            ),
          error: () => this.categoryOptions.set([]),
        });
      }
      if (id) this.loadProduct(id);
      if (!this.canSave()) this.form.disable();
    });
  }

  private attributeGroup(name = '', value = ''): AttributeGroup {
    return newAttributeGroup(this.fb.nonNullable, name, value);
  }
  private optionGroup(name = '', value = '') {
    return this.fb.nonNullable.group({
      name: [name, [Validators.required, Validators.maxLength(60)]],
      value: [value, [Validators.required, Validators.maxLength(120)]],
    });
  }
  protected variantGroup(v?: ProductVariant) {
    return this.fb.nonNullable.group(
      {
        id: [v?.id ?? ''],
        sku: [
          v?.sku ?? '',
          [Validators.required, Validators.maxLength(64), Validators.pattern(/^[A-Za-z0-9._-]+$/)],
        ],
        price: [v ? String(rialToToman(v.priceRial)) : '', [priceValidator]],
        salePrice: [
          v?.salePriceRial ? String(rialToToman(v.salePriceRial)) : '',
          [optionalTomanValidator],
        ],
        weightGrams: [
          v?.weightGrams ? String(v.weightGrams) : '',
          [Validators.pattern(/^[0-9۰-۹]*$/)],
        ],
        isActive: [v?.isActive ?? true],
        options: this.fb.array((v?.options ?? []).map((o) => this.optionGroup(o.name, o.value))),
      },
      { validators: saleBelowPrice },
    );
  }

  protected addAttribute(): void {
    this.form.controls.attributes.push(this.attributeGroup());
  }
  protected removeAttribute(i: number): void {
    this.form.controls.attributes.removeAt(i);
    this.form.markAsDirty();
  }
  protected addVariant(): void {
    this.form.controls.variants.push(this.variantGroup());
  }
  protected removeVariant(i: number): void {
    this.form.controls.variants.removeAt(i);
    this.form.markAsDirty();
  }
  protected addOption(v: ReturnType<ProductFormPage['variantGroup']>): void {
    v.controls.options.push(this.optionGroup());
  }
  protected statusLabel(s: keyof typeof STATUS_LABELS): string {
    return STATUS_LABELS[s] ?? s;
  }

  private loadProduct(id: string): void {
    this.api.product(id).subscribe({
      next: (p) => this.hydrate(p),
      error: (e: unknown) => this.loadError.set(ApiError.from(e).message),
    });
  }

  private hydrate(p: ProductDetail): void {
    this.detail.set(p);
    this.form.controls.attributes.clear();
    this.form.controls.variants.clear();
    p.attributes.forEach((a) =>
      this.form.controls.attributes.push(this.attributeGroup(a.name, a.value)),
    );
    p.variants.forEach((v) => this.form.controls.variants.push(this.variantGroup(v)));
    this.form.patchValue({
      title: p.title,
      slug: p.slug,
      categoryId: p.categoryId ?? '',
      shortDescription: p.shortDescription ?? '',
      description: p.description ?? '',
      seoTitle: p.seoTitle ?? '',
      seoDescription: p.seoDescription ?? '',
      canonicalUrl: p.canonicalUrl ?? '',
    });
    this.form.markAsPristine();
    // Controls created above are enabled by default; keep the whole form read-only for viewers.
    if (!this.canSave()) this.form.disable();
  }

  protected submit(): void {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    this.summaryError.set(null);
    if (this.form.invalid) return;

    const body = this.buildRequest();
    const id = this.id();
    this.saving.set(true);
    (id ? this.api.updateProduct(id, body) : this.api.createProduct(body)).subscribe({
      next: () => {
        this.notify.success(id ? 'تغییرات ذخیره شد.' : 'محصول ایجاد شد.');
        this.form.markAsPristine();
        void this.router.navigate(['/catalog/products']);
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

  private buildRequest(): ProductWriteRequest {
    const v = this.form.getRawValue();
    return {
      slug: v.slug.trim(),
      title: v.title.trim(),
      categoryId: v.categoryId === '' ? null : v.categoryId,
      shortDescription: blankToNull(v.shortDescription),
      description: blankToNull(v.description),
      seoTitle: blankToNull(v.seoTitle),
      seoDescription: blankToNull(v.seoDescription),
      canonicalUrl: blankToNull(v.canonicalUrl),
      // Half-filled attribute rows are dropped rather than sent as noise.
      attributes: v.attributes
        .map((a) => ({ name: a.name.trim(), value: a.value.trim() }))
        .filter((a) => a.name && a.value),
      variants: v.variants.map((g) => {
        const sale = parseTomanInput(g.salePrice);
        const weight = normalizeDigits(g.weightGrams).trim();
        return {
          ...(g.id ? { id: g.id } : {}),
          sku: g.sku.trim(),
          options: g.options.map((o) => ({ name: o.name.trim(), value: o.value.trim() })),
          priceRial: tomanToRial(parseTomanInput(g.price) ?? 0),
          salePriceRial: sale === null || sale === 0 ? null : tomanToRial(sale),
          weightGrams: weight === '' ? null : Number(weight),
          isActive: g.isActive,
        };
      }),
    };
  }

  protected togglePublish(): void {
    const d = this.detail();
    const id = this.id();
    if (!d || !id || this.publishing() || this.form.dirty) return;
    this.publishing.set(true);
    (d.status === 'published'
      ? this.api.unpublishProduct(id)
      : this.api.publishProduct(id)
    ).subscribe({
      next: (p) => {
        this.hydrate(p);
        this.notify.success(p.status === 'published' ? 'محصول منتشر شد.' : 'انتشار محصول لغو شد.');
        this.publishing.set(false);
      },
      error: (e: unknown) => {
        this.notify.error(ApiError.from(e).message);
        this.publishing.set(false);
      },
    });
  }
}
