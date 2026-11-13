import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Permissions } from '../../core/authorization/permissions';
import { expectApi, page, signIn } from '../../../testing/api-test-utils';
import { CustomerDetail } from './customers.models';
import { CustomerDetailPage } from './customer-detail.page';

const detail = (over: Partial<CustomerDetail> = {}): CustomerDetail => ({
  id: 'c1',
  name: 'سارا احمدی',
  mobile: '09121234567',
  email: 's@x.ir',
  ordersCount: 2,
  totalSpentRial: 520_000_000,
  createdAt: '2026-01-10T12:00:00Z',
  addresses: [
    {
      title: 'خانه',
      recipient: 'سارا احمدی',
      province: 'تهران',
      city: 'تهران',
      address: 'خیابان آزادی',
      postalCode: '1234567890',
    },
  ],
  ...over,
});
const orderRow = (id: string) => ({
  id,
  number: `TSK-${id}`,
  status: 'shipped',
  paymentStatus: 'paid',
  totalRial: 260_000_000,
  createdAt: '2026-03-21T12:00:00Z',
});

describe('CustomerDetailPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function open(d = detail(), perms = Object.values(Permissions)) {
    signIn(perms);
    const f = TestBed.createComponent(CustomerDetailPage);
    f.componentRef.setInput('id', 'c1');
    await f.whenStable();
    expectApi('GET', '/admin/customers/c1').flush({ data: d });
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement };
  }

  it('shows the profile, addresses and the order history filtered by this customer', async () => {
    signIn();
    const f = TestBed.createComponent(CustomerDetailPage);
    f.componentRef.setInput('id', 'c1');
    await f.whenStable();
    expectApi('GET', '/admin/customers/c1').flush({ data: detail() });
    await f.whenStable();
    const orders = expectApi('GET', '/admin/orders');
    expect(orders.request.params.get('customerId')).toBe('c1');
    expect(orders.request.params.get('pageSize')).toBe('10');
    orders.flush(page([orderRow('1'), orderRow('2')]));
    await f.whenStable();
    const text = (f.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('سارا احمدی');
    expect(text).toContain('09121234567');
    expect(text).toContain('خیابان آزادی');
    expect(text).toContain('TSK-1');
    expect(text).toContain('تومان');
  });

  it('does not request orders without orders.read and explains why', async () => {
    const { el } = await open(detail(), [Permissions.CustomersRead]);
    expect(el.textContent).toContain('به دسترسی «مشاهده سفارش‌ها» نیاز دارید');
    // verify() in afterEach fails if /admin/orders had been requested
  });

  it('handles a customer without addresses or spend data', async () => {
    const { el } = await open(
      detail({ addresses: [], totalSpentRial: null, mobile: null, email: null }),
      [Permissions.CustomersRead],
    );
    expect(el.textContent).toContain('آدرسی ثبت نشده است.');
    expect(el.textContent).toContain('—');
  });

  it('flags inactive customers', async () => {
    const { el } = await open(detail({ isActive: false }), [Permissions.CustomersRead]);
    expect(el.querySelector('header')!.textContent).toContain('غیرفعال');
  });

  it('shows a load error with retry', async () => {
    signIn([Permissions.CustomersRead]);
    const f = TestBed.createComponent(CustomerDetailPage);
    f.componentRef.setInput('id', 'c1');
    await f.whenStable();
    expectApi('GET', '/admin/customers/c1').flush(
      { detail: 'مشتری پیدا نشد' },
      { status: 404, statusText: 'x' },
    );
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role=alert]')?.textContent).toContain('مشتری پیدا نشد');
    el.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    expectApi('GET', '/admin/customers/c1').flush({ data: detail() });
  });

  it('shows an order-history error independently of the profile', async () => {
    signIn();
    const f = TestBed.createComponent(CustomerDetailPage);
    f.componentRef.setInput('id', 'c1');
    await f.whenStable();
    expectApi('GET', '/admin/customers/c1').flush({ data: detail() });
    await f.whenStable();
    expectApi('GET', '/admin/orders').flush(
      { detail: 'سفارش‌ها در دسترس نیست' },
      { status: 500, statusText: 'x' },
    );
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.textContent).toContain('سارا احمدی');
    expect(el.textContent).toContain('سفارش‌ها در دسترس نیست');
  });
});
