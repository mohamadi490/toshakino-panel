import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Permissions } from '../../core/authorization/permissions';
import { expectApi, signIn } from '../../../testing/api-test-utils';
import { DashboardSummary } from './dashboard.models';
import { DashboardPage } from './dashboard.page';

const summary = (over: Partial<DashboardSummary> = {}): DashboardSummary => ({
  range: { from: '2026-03-15T00:00:00Z', to: '2026-03-21T00:00:00Z' },
  ordersCount: 12,
  salesRial: 1_500_000_000,
  averageOrderRial: 125_000_000,
  ordersByStatus: [
    { status: 'processing', count: 6 },
    { status: 'shipped', count: 3 },
    { status: 'weird_state', count: 3 },
  ],
  salesSeries: [
    { date: '2026-03-19T00:00:00Z', salesRial: 500_000_000 },
    { date: '2026-03-20T00:00:00Z', salesRial: 0 },
    { date: '2026-03-21T00:00:00Z', salesRial: 1_000_000_000 },
  ],
  pendingOrdersCount: 4,
  lowStockCount: 2,
  ...over,
});

describe('DashboardPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function open(data: DashboardSummary = summary(), perms = Object.values(Permissions)) {
    signIn(perms);
    const f = TestBed.createComponent(DashboardPage);
    await f.whenStable();
    const req = expectApi('GET', '/admin/dashboard/summary');
    req.flush({ data });
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement, req };
  }

  it('requests the default 7-day range and shows real figures in Persian digits and Toman', async () => {
    const { el, req } = await open();
    expect(req.request.params.get('range')).toBe('7d');
    const text = el.textContent!;
    expect(text).toContain('۱۲');
    expect(text).toContain('تومان');
    expect(text).toContain('۴'); // pending orders
    expect(text).toContain('از ');
  });

  it('breaks orders down by status with known labels and raw fallback for unknown keys', async () => {
    const { el } = await open();
    const text = el.querySelector('[aria-labelledby=h-status]')!.textContent!;
    expect(text).toContain('در حال پردازش');
    expect(text).toContain('ارسال‌شده');
    expect(text).toContain('weird_state');
  });

  it('draws the sales chart only when the backend sent a series with sales', async () => {
    const { el } = await open();
    expect(el.querySelectorAll('app-bar-chart rect').length).toBe(3);
  });

  it('shows an honest empty state instead of an empty chart when there were no sales', async () => {
    const { el } = await open(
      summary({
        salesSeries: [{ date: '2026-03-21T00:00:00Z', salesRial: 0 }],
        ordersByStatus: [],
      }),
    );
    expect(el.querySelector('app-bar-chart')).toBeNull();
    expect(el.textContent).toContain('فروشی ثبت نشده است');
    expect(el.textContent).toContain('سفارشی در این بازه وجود ندارد');
  });

  it('omits optional cards the backend did not provide (nothing is invented)', async () => {
    const { el } = await open(
      summary({ averageOrderRial: null, pendingOrdersCount: undefined, lowStockCount: undefined }),
    );
    expect(el.textContent).not.toContain('میانگین سفارش');
    expect(el.textContent).not.toContain('در انتظار');
    expect(el.textContent).not.toContain('کم‌موجود');
  });

  it('shows zero values as zero rather than hiding them', async () => {
    const { el } = await open(summary({ pendingOrdersCount: 0 }));
    expect(el.textContent).toContain('سفارش‌های در انتظار');
  });

  it('links to orders/inventory only when the role may open them', async () => {
    const full = await open();
    expect(full.el.querySelector('a[href="/orders"]')).not.toBeNull();
    expect(full.el.querySelector('a[href="/inventory"]')).not.toBeNull();
  });

  it('hides those links without orders.read / inventory.read', async () => {
    const { el } = await open(summary(), [Permissions.ReportsRead]);
    expect(el.querySelector('a[href="/orders"]')).toBeNull();
    expect(el.querySelector('a[href="/inventory"]')).toBeNull();
  });

  it('switching the range requests the new range and keeps the old figures visible meanwhile', async () => {
    const { f, el } = await open();
    Array.from(el.querySelectorAll<HTMLButtonElement>('[aria-label="بازه زمانی"] button'))
      .find((b) => b.textContent!.includes('۳۰'))!
      .click();
    await f.whenStable();
    expect(el.textContent).toContain('۱۲'); // still showing previous data, dimmed
    const req = expectApi('GET', '/admin/dashboard/summary');
    expect(req.request.params.get('range')).toBe('30d');
    req.flush({ data: summary({ ordersCount: 99 }) });
    await f.whenStable();
    expect(el.textContent).toContain('۹۹');
  });

  it('ignores a stale response when the range changed again', async () => {
    const { f, el } = await open();
    const click = (text: string) =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('[aria-label="بازه زمانی"] button'))
        .find((b) => b.textContent!.includes(text))!
        .click();
    click('۳۰');
    await f.whenStable();
    const slow = expectApi('GET', '/admin/dashboard/summary');
    click('امروز');
    await f.whenStable();
    const fast = expectApi('GET', '/admin/dashboard/summary');
    expect(fast.request.params.get('range')).toBe('today');
    fast.flush({ data: summary({ ordersCount: 5 }) });
    await f.whenStable();
    expect(slow.cancelled).toBe(true);
    expect(el.textContent).toContain('۵');
  });

  it('shows an error with retry', async () => {
    signIn();
    const f = TestBed.createComponent(DashboardPage);
    await f.whenStable();
    expectApi('GET', '/admin/dashboard/summary').flush(
      { detail: 'آمار در دسترس نیست' },
      { status: 500, statusText: 'x' },
    );
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role=alert]')!.textContent).toContain('آمار در دسترس نیست');
    el.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    expectApi('GET', '/admin/dashboard/summary').flush({ data: summary() });
  });

  it('without reports.read makes no stats request and explains why', async () => {
    signIn([Permissions.OrdersRead]);
    const f = TestBed.createComponent(DashboardPage);
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.textContent).toContain('به دسترسی «مشاهده گزارش‌ها» نیاز دارید');
    expect(el.querySelector('[aria-label="بازه زمانی"]')).toBeNull();
    // verify() in afterEach fails if a summary request had been made
  });
});
