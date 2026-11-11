import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Permissions } from '../../core/authorization/permissions';
import { expectApi, page, signIn } from '../../../testing/api-test-utils';
import { ProductDetail } from './catalog.models';
import { ProductFormPage } from './product-form.page';

function fill(el: HTMLElement, selector: string, value: string) {
  const input = el.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}
const clickText = (el: HTMLElement, text: string) =>
  Array.from(el.querySelectorAll<HTMLButtonElement>('button'))
    .find((b) => b.textContent?.includes(text))!
    .click();

const detail = (over: Partial<ProductDetail> = {}): ProductDetail => ({
  id: 'p1',
  slug: 'soft',
  title: 'تشک نرم',
  status: 'draft',
  variantCount: 1,
  updatedAt: 'x',
  categoryId: null,
  attributes: [{ name: 'جنس', value: 'فوم' }],
  variants: [
    {
      id: 'v1',
      sku: 'SOFT-90',
      options: [{ name: 'سایز', value: '90×200' }],
      priceRial: 125_000_000,
      salePriceRial: null,
      weightGrams: 12000,
      isActive: true,
    },
  ],
  ...over,
});

describe('ProductFormPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function create() {
    signIn();
    const f = TestBed.createComponent(ProductFormPage);
    await f.whenStable();
    expectApi('GET', '/admin/categories').flush(page([]));
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement };
  }

  async function edit(d = detail(), perms = Object.values(Permissions)) {
    signIn(perms);
    const f = TestBed.createComponent(ProductFormPage);
    f.componentRef.setInput('id', 'p1');
    await f.whenStable();
    if (perms.includes(Permissions.CategoriesRead))
      expectApi('GET', '/admin/categories').flush(page([]));
    expectApi('GET', '/admin/products/p1').flush({ data: d });
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement };
  }

  it('converts Toman input (Persian digits, separators) to integer Rial on create', async () => {
    const { f, el } = await create();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#title', 'تشک طبی');
    fill(el, '#slug', 'medical');
    clickText(el, 'افزودن Variant');
    await f.whenStable();
    fill(el, '#sku-0', 'MED-90');
    fill(el, '#price-0', '۱۲٬۵۰۰٬۰۰۰');
    fill(el, '#sale-0', '11,000,000');
    fill(el, '#weight-0', '۱۲۰۰۰');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = expectApi('POST', '/admin/products');
    const v = (req.request.body as { variants: Record<string, unknown>[] }).variants[0]!;
    expect(v['priceRial']).toBe(125_000_000);
    expect(v['salePriceRial']).toBe(110_000_000);
    expect(v['weightGrams']).toBe(12000);
    expect(v['sku']).toBe('MED-90');
    req.flush({ data: detail() });
  });

  it('blocks submit when the sale price is not below the price', async () => {
    const { f, el } = await create();
    fill(el, '#title', 'x');
    fill(el, '#slug', 'x');
    clickText(el, 'افزودن Variant');
    await f.whenStable();
    fill(el, '#sku-0', 'A');
    fill(el, '#price-0', '1000');
    fill(el, '#sale-0', '1000');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(el.textContent).toContain('قیمت تخفیفی باید کمتر از قیمت اصلی باشد.');
  });

  it('blocks submit for duplicate SKUs (case-insensitive)', async () => {
    const { f, el } = await create();
    fill(el, '#title', 'x');
    fill(el, '#slug', 'x');
    for (let i = 0; i < 2; i++) {
      clickText(el, 'افزودن Variant');
      await f.whenStable();
    }
    fill(el, '#sku-0', 'abc');
    fill(el, '#price-0', '1000');
    fill(el, '#sku-1', 'ABC');
    fill(el, '#price-1', '2000');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(el.textContent).toContain('SKU نباید در یک محصول تکراری باشد.');
  });

  it('rejects an invalid price', async () => {
    const { f, el } = await create();
    fill(el, '#title', 'x');
    fill(el, '#slug', 'x');
    clickText(el, 'افزودن Variant');
    await f.whenStable();
    fill(el, '#sku-0', 'A');
    fill(el, '#price-0', '12.5');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(el.textContent).toContain('مبلغ معتبر به تومان');
  });

  it('drops half-filled attribute rows from the payload', async () => {
    const { f, el } = await create();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#title', 'x');
    fill(el, '#slug', 'x');
    clickText(el, 'افزودن مشخصه');
    clickText(el, 'افزودن مشخصه');
    await f.whenStable();
    fill(el, '[aria-label="نام مشخصه 1"]', 'جنس');
    fill(el, '[aria-label="مقدار مشخصه 1"]', 'فوم');
    fill(el, '[aria-label="نام مشخصه 2"]', 'ناقص');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = expectApi('POST', '/admin/products');
    expect((req.request.body as { attributes: unknown[] }).attributes).toEqual([
      { name: 'جنس', value: 'فوم' },
    ]);
    req.flush({ data: detail() });
  });

  it('loads an existing product converting Rial back to Toman', async () => {
    const { el } = await edit();
    expect(el.querySelector<HTMLInputElement>('#price-0')!.value).toBe('12500000');
    expect(el.querySelector<HTMLInputElement>('#sku-0')!.value).toBe('SOFT-90');
    expect(el.textContent).toContain('پیش‌نویس');
  });

  it('keeps the variant id on update and shows a backend SKU conflict inline', async () => {
    const { f, el } = await edit();
    fill(el, '#title', 'تشک نرم ۲');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = expectApi('PATCH', '/admin/products/p1');
    expect((req.request.body as { variants: { id?: string }[] }).variants[0]!.id).toBe('v1');
    req.flush(
      { code: 'conflict', fieldErrors: { slug: ['اسلاگ تکراری است.'] } },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expect(el.textContent).toContain('اسلاگ تکراری است.');
  });

  const publishButton = (el: HTMLElement) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('header button')).find((b) =>
      b.textContent?.includes('انتشار'),
    )!;

  it('disables publish while the form has unsaved changes', async () => {
    const { f, el } = await edit();
    expect(publishButton(el).disabled).toBe(false);
    fill(el, '#title', 'تغییر');
    await f.whenStable();
    expect(publishButton(el).disabled).toBe(true);
    expect(el.textContent).toContain('ابتدا تغییرات را ذخیره کنید');
  });

  it('publishes a saved product and reflects the new status', async () => {
    const { f, el } = await edit();
    publishButton(el).click();
    expectApi('POST', '/admin/products/p1/publish').flush({
      data: detail({ status: 'published' }),
    });
    await f.whenStable();
    expect(el.querySelector('header')!.textContent).toContain('منتشرشده');
    expect(publishButton(el).textContent).toContain('لغو انتشار');
  });

  it('cannot publish a product without an active priced variant', async () => {
    const { el } = await edit(detail({ variants: [] }));
    const btn = Array.from(el.querySelectorAll<HTMLButtonElement>('header button')).find((b) =>
      b.textContent?.includes('انتشار'),
    )!;
    expect(btn.disabled).toBe(true);
    expect(el.textContent).toContain('حداقل یک Variant فعال');
  });

  it('is read-only without products.update and hides save', async () => {
    const { el } = await edit(detail(), [Permissions.ProductsRead]);
    expect(el.querySelector<HTMLInputElement>('#title')!.disabled).toBe(true);
    expect(el.querySelector('button[type=submit]')).toBeNull();
    expect(el.textContent).not.toContain('افزودن Variant');
  });

  it('shows a load error for an unknown product', async () => {
    signIn();
    const f = TestBed.createComponent(ProductFormPage);
    f.componentRef.setInput('id', 'zzz');
    await f.whenStable();
    expectApi('GET', '/admin/categories').flush(page([]));
    expectApi('GET', '/admin/products/zzz').flush(
      { detail: 'محصول پیدا نشد' },
      { status: 404, statusText: 'x' },
    );
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).textContent).toContain('محصول پیدا نشد');
  });
});
