import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Permissions } from '../../core/authorization/permissions';
import { ConfirmService } from '../../shared/ui/confirm';
import { expectApi, page, signIn } from '../../../testing/api-test-utils';
import { ProductSummary } from './catalog.models';
import { ProductsListPage } from './products-list.page';

const product = (id: string, status: ProductSummary['status'] = 'draft'): ProductSummary => ({
  id,
  slug: `slug-${id}`,
  title: `محصول ${id}`,
  status,
  categoryTitle: 'تشک طبی',
  minPriceRial: 125_000_000,
  variantCount: 2,
  updatedAt: '2026-03-21T12:00:00Z',
});

describe('ProductsListPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function open(
    perms = Object.values(Permissions),
    items: ProductSummary[] = [product('a')],
  ) {
    signIn(perms);
    const f = TestBed.createComponent(ProductsListPage);
    await f.whenStable();
    if (perms.includes(Permissions.CategoriesRead))
      expectApi('GET', '/admin/categories').flush(page([]));
    const req = expectApi('GET', '/admin/products');
    req.flush(page(items));
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement, req };
  }

  it('renders products with Toman price (Rial/10) and Persian status', async () => {
    const { el, req } = await open();
    expect(req.request.params.get('pageSize')).toBe('20');
    expect(el.textContent).toContain('محصول a');
    expect(el.textContent).toContain('پیش‌نویس');
    expect(el.textContent).toContain('تومان');
    expect(el.textContent).toMatch(/[۰-۹]/);
  });

  it('sends the status filter and resets to page 1', async () => {
    const { f, el } = await open();
    const select = el.querySelector<HTMLSelectElement>('select[aria-label="وضعیت"]')!;
    select.value = 'published';
    select.dispatchEvent(new Event('change'));
    await f.whenStable();
    const req = expectApi('GET', '/admin/products');
    expect(req.request.params.get('status')).toBe('published');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(page([]));
  });

  it('hides publish actions without products.publish', async () => {
    const { el } = await open([Permissions.ProductsRead]);
    expect(el.querySelector('tbody button')).toBeNull();
  });

  it('does nothing when the publish confirmation is declined', async () => {
    const { f, el } = await open();
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(false);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable(); // verify() in afterEach fails if a POST was made
  });

  it('publishes after confirmation and reloads', async () => {
    const { f, el } = await open();
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
    expectApi('POST', '/admin/products/a/publish').flush({ data: product('a', 'published') });
    expectApi('GET', '/admin/products').flush(page([product('a', 'published')]));
  });

  it('shows error + retry', async () => {
    signIn([Permissions.ProductsRead]);
    const f = TestBed.createComponent(ProductsListPage);
    await f.whenStable();
    expectApi('GET', '/admin/products').flush({ detail: 'قطع' }, { status: 500, statusText: 'x' });
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role=alert]')?.textContent).toContain('قطع');
    el.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    expectApi('GET', '/admin/products').flush(page([]));
  });
});
