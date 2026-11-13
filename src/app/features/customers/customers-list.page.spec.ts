import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { expectApi, page, signIn } from '../../../testing/api-test-utils';
import { CustomerSummary } from './customers.models';
import { CustomersListPage } from './customers-list.page';

const customer = (id: string, over: Partial<CustomerSummary> = {}): CustomerSummary => ({
  id,
  name: `مشتری ${id}`,
  mobile: '09121234567',
  ordersCount: 3,
  totalSpentRial: 500_000_000,
  lastOrderAt: '2026-03-21T12:00:00Z',
  createdAt: '2026-01-10T12:00:00Z',
  ...over,
});

describe('CustomersListPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    signIn();
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function open(items: CustomerSummary[] = [customer('a')]) {
    const f = TestBed.createComponent(CustomersListPage);
    await f.whenStable();
    const req = expectApi('GET', '/admin/customers');
    req.flush(page(items));
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement, req };
  }

  it('renders customers with paging params, Persian numbers and Toman spend', async () => {
    const { el, req } = await open();
    expect(req.request.params.get('pageSize')).toBe('20');
    expect(req.request.params.get('sort')).toBe('-createdAt');
    const row = el.querySelector('tbody tr')!.textContent!;
    expect(row).toContain('مشتری a');
    expect(row).toContain('09121234567');
    expect(row).toContain('تومان');
  });

  it('falls back to email, then a dash, when the backend omits the mobile', async () => {
    const { el } = await open([
      customer('e', { mobile: null, email: 'e@x.ir' }),
      customer('n', { mobile: null, email: null }),
    ]);
    const rows = Array.from(el.querySelectorAll('tbody tr')).map((r) => r.textContent!);
    expect(rows[0]).toContain('e@x.ir');
    expect(rows[1]).toContain('—');
  });

  it('sends the sort and resets to page 1', async () => {
    const { f, el } = await open();
    const s = el.querySelector<HTMLSelectElement>('select[aria-label="مرتب‌سازی"]')!;
    s.value = '-totalSpent';
    s.dispatchEvent(new Event('change'));
    await f.whenStable();
    const req = expectApi('GET', '/admin/customers');
    expect(req.request.params.get('sort')).toBe('-totalSpent');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(page([]));
  });

  it('shows the error state and retries', async () => {
    const f = TestBed.createComponent(CustomersListPage);
    await f.whenStable();
    expectApi('GET', '/admin/customers').flush({ detail: 'قطع' }, { status: 500, statusText: 'x' });
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role=alert]')?.textContent).toContain('قطع');
    el.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    expectApi('GET', '/admin/customers').flush(page([]));
  });
});
