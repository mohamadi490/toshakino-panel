import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { expectApi, page, signIn } from '../../../testing/api-test-utils';
import { OrderSummary } from './orders.models';
import { OrdersListPage } from './orders-list.page';

const order = (id: string, over: Partial<OrderSummary> = {}): OrderSummary => ({
  id,
  number: `TSK-${id}`,
  customerName: 'سارا',
  status: 'processing',
  paymentStatus: 'paid',
  shippingStatus: 'pending',
  itemCount: 2,
  totalRial: 250_000_000,
  createdAt: '2026-03-21T12:00:00Z',
  ...over,
});

describe('OrdersListPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    signIn();
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function open(items: OrderSummary[] = [order('1')]) {
    const f = TestBed.createComponent(OrdersListPage);
    await f.whenStable();
    const req = expectApi('GET', '/admin/orders');
    req.flush(page(items));
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement, req };
  }

  it('requests newest first with paging and renders rows with Toman totals and Persian labels', async () => {
    const { el, req } = await open();
    expect(req.request.params.get('sort')).toBe('-createdAt');
    expect(req.request.params.get('pageSize')).toBe('20');
    const row = el.querySelector('tbody tr')!.textContent!;
    expect(row).toContain('TSK-1');
    expect(row).toContain('در حال پردازش');
    expect(row).toContain('پرداخت‌شده');
    expect(row).toContain('تومان');
  });

  it('shows unknown statuses raw instead of failing', async () => {
    const { el } = await open([order('2', { status: 'awaiting_courier' })]);
    expect(el.querySelector('tbody tr')!.textContent).toContain('awaiting_courier');
  });

  it.each([
    ['وضعیت سفارش', 'status', 'shipped'],
    ['وضعیت پرداخت', 'paymentStatus', 'failed'],
    ['مرتب‌سازی', 'sort', '-total'],
  ])('sends the %s filter and resets to page 1', async (label, param, value) => {
    const { f, el } = await open();
    const select = el.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`)!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await f.whenStable();
    const req = expectApi('GET', '/admin/orders');
    expect(req.request.params.get(param)).toBe(value);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(page([]));
  });

  it('shows the error state and retries', async () => {
    const f = TestBed.createComponent(OrdersListPage);
    await f.whenStable();
    expectApi('GET', '/admin/orders').flush({ detail: 'قطع' }, { status: 500, statusText: 'x' });
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role=alert]')?.textContent).toContain('قطع');
    el.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    expectApi('GET', '/admin/orders').flush(page([]));
  });
});
