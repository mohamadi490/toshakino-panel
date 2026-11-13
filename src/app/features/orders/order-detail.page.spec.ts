import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Permissions } from '../../core/authorization/permissions';
import { ConfirmService } from '../../shared/ui/confirm';
import { expectApi, signIn } from '../../../testing/api-test-utils';
import { OrderDetail } from './orders.models';
import { OrderDetailPage } from './order-detail.page';

const detail = (over: Partial<OrderDetail> = {}): OrderDetail => ({
  id: 'o1',
  number: 'TSK-1001',
  customerName: 'سارا',
  status: 'processing',
  paymentStatus: 'paid',
  shippingStatus: 'pending',
  itemCount: 1,
  totalRial: 260_000_000,
  createdAt: '2026-03-21T12:00:00Z',
  customer: { name: 'سارا احمدی', mobile: '09121234567', email: 's@x.ir' },
  shippingAddress: {
    recipient: 'سارا احمدی',
    province: 'تهران',
    city: 'تهران',
    address: 'خیابان آزادی',
    postalCode: '1234567890',
  },
  shippingMethod: 'پست پیشتاز',
  items: [
    {
      sku: 'SOFT-90',
      title: 'تشک نرم',
      optionsLabel: '۹۰×۲۰۰',
      quantity: 2,
      unitPriceRial: 120_000_000,
      discountRial: 0,
      lineTotalRial: 240_000_000,
    },
  ],
  subtotalRial: 240_000_000,
  discountRial: 0,
  shippingRial: 20_000_000,
  payments: [
    {
      id: 'p1',
      status: 'paid',
      amountRial: 260_000_000,
      gateway: 'zarinpal',
      referenceId: 'A1',
      createdAt: '2026-03-21T12:05:00Z',
    },
  ],
  history: [
    {
      from: 'pending',
      to: 'processing',
      actor: 'مدیر',
      note: 'پرداخت تأیید شد',
      at: '2026-03-21T12:06:00Z',
    },
  ],
  allowedTransitions: ['shipped', 'cancelled'],
  ...over,
});

describe('OrderDetailPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function open(d = detail(), perms = Object.values(Permissions)) {
    signIn(perms);
    const f = TestBed.createComponent(OrderDetailPage);
    f.componentRef.setInput('id', 'o1');
    await f.whenStable();
    expectApi('GET', '/admin/orders/o1').flush({ data: d });
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    const select = async (value: string) => {
      const s = el.querySelector<HTMLSelectElement>('#new-status')!;
      s.value = value;
      s.dispatchEvent(new Event('change'));
      await f.whenStable();
    };
    const note = async (value: string) => {
      const n = el.querySelector<HTMLTextAreaElement>('#status-note')!;
      n.value = value;
      n.dispatchEvent(new Event('input'));
      await f.whenStable();
    };
    const submit = () => el.querySelector('form')!.dispatchEvent(new Event('submit'));
    return { f, el, select, note, submit };
  }

  it('shows items, purchase-time prices, totals, payments and history', async () => {
    const { el } = await open();
    const text = el.textContent!;
    expect(text).toContain('TSK-1001');
    expect(text).toContain('SOFT-90');
    expect(text).toContain('تومان');
    expect(text).toContain('zarinpal');
    expect(text).toContain('پرداخت تأیید شد');
  });

  it('offers exactly the server-allowed transitions', async () => {
    const { el } = await open();
    const options = Array.from(el.querySelectorAll<HTMLOptionElement>('#new-status option')).map(
      (o) => o.value,
    );
    expect(options).toEqual(['', 'shipped', 'cancelled']);
  });

  it('hides the cancel transition without orders.cancel', async () => {
    const { el } = await open(detail(), [
      Permissions.OrdersRead,
      Permissions.OrdersUpdateStatus,
      Permissions.CustomersRead,
    ]);
    const options = Array.from(el.querySelectorAll<HTMLOptionElement>('#new-status option')).map(
      (o) => o.value,
    );
    expect(options).toEqual(['', 'shipped']);
  });

  it('hides the status panel for read-only admins', async () => {
    const { el } = await open(detail(), [Permissions.OrdersRead]);
    expect(el.querySelector('#new-status')).toBeNull();
  });

  it('says so when no further transition is allowed', async () => {
    const { el } = await open(detail({ allowedTransitions: [] }));
    expect(el.textContent).toContain('تغییر وضعیت دیگری مجاز نیست');
    expect(el.querySelector('#new-status')).toBeNull();
  });

  it('masks customer contact and address without customers.read', async () => {
    const { el } = await open(detail(), [Permissions.OrdersRead]);
    expect(el.textContent).not.toContain('09121234567');
    expect(el.textContent).not.toContain('خیابان آزادی');
    expect(el.textContent).toContain('قابل نمایش نیست');
  });

  it('shows contact and address with customers.read', async () => {
    const { el } = await open();
    expect(el.textContent).toContain('09121234567');
    expect(el.textContent).toContain('خیابان آزادی');
  });

  it('changes status with an Idempotency-Key and replaces the order with the server response', async () => {
    const { f, el, select, submit } = await open();
    await select('shipped');
    submit();
    await f.whenStable();
    const req = expectApi('PATCH', '/admin/orders/o1/status');
    expect(req.request.body).toEqual({ status: 'shipped' });
    expect(req.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{32,36}$/);
    req.flush({ data: detail({ status: 'shipped', allowedTransitions: ['delivered'] }) });
    await f.whenStable();
    expect(el.querySelector('header')!.textContent).toContain('ارسال‌شده');
    expect(
      Array.from(el.querySelectorAll<HTMLOptionElement>('#new-status option')).map((o) => o.value),
    ).toEqual(['', 'delivered']);
  });

  it('requires a note and a confirmation to cancel, and sends nothing when declined', async () => {
    const { f, el, select, note, submit } = await open();
    const confirm = vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(false);
    await select('cancelled');
    submit();
    await f.whenStable();
    expect(el.textContent).toContain('این فیلد الزامی است.');
    expect(confirm).not.toHaveBeenCalled();
    await note('مشتری انصراف داد');
    submit();
    await f.whenStable();
    expect(confirm).toHaveBeenCalled(); // declined => no PATCH (verify() enforces)
  });

  it('cancels after confirmation including the note', async () => {
    const { f, select, note, submit } = await open();
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(true);
    await select('cancelled');
    await note('مشتری انصراف داد');
    submit();
    await f.whenStable();
    const req = expectApi('PATCH', '/admin/orders/o1/status');
    expect(req.request.body).toEqual({ status: 'cancelled', note: 'مشتری انصراف داد' });
    req.flush({ data: detail({ status: 'cancelled', allowedTransitions: [] }) });
  });

  it('reuses the key when retrying the same change and rotates it when the change differs', async () => {
    const { f, select, submit } = await open();
    await select('shipped');
    submit();
    await f.whenStable();
    const first = expectApi('PATCH', '/admin/orders/o1/status');
    const key = first.request.headers.get('Idempotency-Key');
    first.flush({ detail: 'قطع' }, { status: 503, statusText: 'x' });
    await f.whenStable();
    submit();
    await f.whenStable();
    const second = expectApi('PATCH', '/admin/orders/o1/status');
    expect(second.request.headers.get('Idempotency-Key')).toBe(key);
    second.flush({ detail: 'قطع' }, { status: 503, statusText: 'x' });
    await f.whenStable();
    await select('cancelled');
    await select('shipped'); // value changes twice => fresh key for a new intent
    submit();
    await f.whenStable();
    const third = expectApi('PATCH', '/admin/orders/o1/status');
    expect(third.request.headers.get('Idempotency-Key')).not.toBe(key);
    third.flush({ data: detail() });
  });

  it('reloads the order when the backend reports a conflict (state changed elsewhere)', async () => {
    const { f, select, submit } = await open();
    await select('shipped');
    submit();
    await f.whenStable();
    expectApi('PATCH', '/admin/orders/o1/status').flush(
      { detail: 'وضعیت تغییر کرده است.' },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expectApi('GET', '/admin/orders/o1').flush({
      data: detail({ status: 'shipped', allowedTransitions: ['delivered'] }),
    });
  });

  it('shows a load error with retry', async () => {
    signIn();
    const f = TestBed.createComponent(OrderDetailPage);
    f.componentRef.setInput('id', 'o1');
    await f.whenStable();
    expectApi('GET', '/admin/orders/o1').flush(
      { detail: 'سفارش پیدا نشد' },
      { status: 404, statusText: 'x' },
    );
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role=alert]')?.textContent).toContain('سفارش پیدا نشد');
    el.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    expectApi('GET', '/admin/orders/o1').flush({ data: detail() });
  });
});
