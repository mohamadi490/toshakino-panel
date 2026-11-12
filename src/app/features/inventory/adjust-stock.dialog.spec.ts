import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { expectApi, signIn } from '../../../testing/api-test-utils';
import { AdjustStockDialogComponent } from './adjust-stock.dialog';
import { InventoryItem } from './inventory.models';

const ITEM: InventoryItem = {
  variantId: 'v1',
  sku: 'S-1',
  productId: 'p',
  productTitle: 'تشک',
  onHand: 10,
  reserved: 0,
  available: 10,
};

describe('AdjustStockDialogComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    signIn();
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function open() {
    const f = TestBed.createComponent(AdjustStockDialogComponent);
    f.componentRef.setInput('item', ITEM);
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    const type = async (selector: string, value: string, event = 'input') => {
      const node = el.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        selector,
      )!;
      node.value = value;
      node.dispatchEvent(new Event(event));
      await f.whenStable();
    };
    const choose = async (value: string) => {
      const radio = el.querySelector<HTMLInputElement>(`input[type=radio][value=${value}]`)!;
      radio.click();
      await f.whenStable();
    };
    const submit = () => el.querySelector('form')!.dispatchEvent(new Event('submit'));
    return { f, el, type, choose, submit };
  }

  it('sends a positive delta for an increase, normalising Persian digits, with an Idempotency-Key', async () => {
    const { type, submit } = await open();
    await type('#adjust-qty', '۱۲');
    submit();
    const req = expectApi('POST', '/admin/inventory/adjustments');
    expect(req.request.body).toEqual({ variantId: 'v1', delta: 12, reasonCode: 'received' });
    expect(req.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{32,36}$/);
    req.flush({ data: ITEM });
  });

  it('sends a negative delta for a decrease and previews the resulting stock', async () => {
    const { el, type, choose, submit } = await open();
    await choose('decrease');
    await type('#adjust-qty', '4');
    expect(el.querySelector('[role=status]')!.textContent).toContain('۶');
    await type('#adjust-reason', 'damaged', 'change');
    submit();
    const req = expectApi('POST', '/admin/inventory/adjustments');
    expect(req.request.body).toEqual({ variantId: 'v1', delta: -4, reasonCode: 'damaged' });
    req.flush({ data: ITEM });
  });

  it('refuses a decrease that would make stock negative and sends nothing', async () => {
    const { el, type, choose, submit } = await open();
    await choose('decrease');
    await type('#adjust-qty', '11');
    submit();
    expect(el.textContent).toContain('موجودی نمی‌تواند منفی شود');
    expect(el.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
  });

  it.each(['0', '-3', '1.5', 'abc', ''])('rejects quantity "%s"', async (q) => {
    const { f, el, type, submit } = await open();
    await type('#adjust-qty', q);
    submit();
    await f.whenStable();
    expect(el.textContent).toMatch(/تعداد|الزامی|معتبر/);
  });

  it('requires a note when the reason is "other"', async () => {
    const { f, el, type, submit } = await open();
    await type('#adjust-qty', '1');
    await type('#adjust-reason', 'other', 'change');
    submit();
    await f.whenStable();
    expect(el.textContent).toContain('این فیلد الزامی است.');
  });

  it('reuses the Idempotency-Key when retrying the same payload, and rotates it when the payload changes', async () => {
    const { type, submit } = await open();
    await type('#adjust-qty', '3');
    submit();
    const first = expectApi('POST', '/admin/inventory/adjustments');
    const key1 = first.request.headers.get('Idempotency-Key');
    first.flush({ detail: 'قطع' }, { status: 503, statusText: 'x' });

    submit(); // same intent again
    const second = expectApi('POST', '/admin/inventory/adjustments');
    expect(second.request.headers.get('Idempotency-Key')).toBe(key1);
    second.flush({ detail: 'قطع' }, { status: 503, statusText: 'x' });

    await type('#adjust-qty', '4'); // different intent
    submit();
    const third = expectApi('POST', '/admin/inventory/adjustments');
    expect(third.request.headers.get('Idempotency-Key')).not.toBe(key1);
    third.flush({ data: ITEM });
  });

  it('ignores a second submit while the first request is in flight', async () => {
    const { type, submit } = await open();
    await type('#adjust-qty', '2');
    submit();
    submit();
    expectApi('POST', '/admin/inventory/adjustments').flush({ data: ITEM }); // exactly one (verify enforces)
  });

  it('maps backend field errors (delta -> quantity) onto the form', async () => {
    const { f, el, type, submit } = await open();
    await type('#adjust-qty', '2');
    submit();
    expectApi('POST', '/admin/inventory/adjustments').flush(
      {
        code: 'validation_error',
        fieldErrors: { delta: ['موجودی کافی نیست؛ بخشی رزرو شده است.'] },
      },
      { status: 422, statusText: 'x' },
    );
    await f.whenStable();
    expect(el.textContent).toContain('موجودی کافی نیست؛ بخشی رزرو شده است.');
  });

  it('emits the server item on success and closed on cancel', async () => {
    const { f, el, type, submit } = await open();
    const adjusted: InventoryItem[] = [];
    let closed = 0;
    f.componentInstance.adjusted.subscribe((i) => adjusted.push(i));
    f.componentInstance.closed.subscribe(() => closed++);
    await type('#adjust-qty', '2');
    submit();
    expectApi('POST', '/admin/inventory/adjustments').flush({
      data: { ...ITEM, onHand: 12, available: 12 },
    });
    expect(adjusted[0]?.onHand).toBe(12);
    el.querySelector<HTMLButtonElement>('button[type=button]')!.click();
    expect(closed).toBe(1);
  });
});
