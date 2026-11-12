import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Permissions } from '../../core/authorization/permissions';
import { expectApi, page, signIn } from '../../../testing/api-test-utils';
import { InventoryItem } from './inventory.models';
import { InventoryListPage } from './inventory-list.page';

const item = (id: string, over: Partial<InventoryItem> = {}): InventoryItem => ({
  variantId: id,
  sku: `SKU-${id}`,
  productId: 'p',
  productTitle: `محصول ${id}`,
  onHand: 10,
  reserved: 2,
  available: 8,
  ...over,
});

describe('InventoryListPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function open(perms = Object.values(Permissions), items: InventoryItem[] = [item('a')]) {
    signIn(perms);
    const f = TestBed.createComponent(InventoryListPage);
    await f.whenStable();
    const req = expectApi('GET', '/admin/inventory');
    req.flush(page(items));
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement, req };
  }

  it('renders on-hand, reserved and available with Persian digits', async () => {
    const { el, req } = await open();
    expect(req.request.params.get('pageSize')).toBe('20');
    const row = el.querySelector('tbody tr')!.textContent!;
    expect(row).toContain('SKU-a');
    expect(row).toContain('۱۰');
    expect(row).toContain('۸');
    expect(row).toContain('موجود');
  });

  it('flags out-of-stock and low-stock rows', async () => {
    const { el } = await open(Object.values(Permissions), [
      item('zero', { onHand: 2, reserved: 2, available: 0 }),
      item('low', { available: 3, lowStockThreshold: 5 }),
    ]);
    const rows = Array.from(el.querySelectorAll('tbody tr')).map((r) => r.textContent!);
    expect(rows[0]).toContain('ناموجود');
    expect(rows[1]).toContain('کم‌موجود');
  });

  it('sends lowStock=true when the filter is ticked', async () => {
    const { f, el } = await open();
    const box = el.querySelector<HTMLInputElement>('input[type=checkbox]')!;
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    await f.whenStable();
    const req = expectApi('GET', '/admin/inventory');
    expect(req.request.params.get('lowStock')).toBe('true');
    req.flush(page([]));
  });

  it('hides the adjust action without inventory.adjust', async () => {
    const { el } = await open([Permissions.InventoryRead]);
    expect(el.querySelector('tbody button')).toBeNull();
  });

  it('opens the adjust dialog and replaces the row with the server figures after success', async () => {
    const { f, el } = await open();
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
    expect(el.querySelector('app-adjust-stock-dialog')).not.toBeNull();
    const qty = el.querySelector<HTMLInputElement>('#adjust-qty')!;
    qty.value = '5';
    qty.dispatchEvent(new Event('input'));
    el.querySelector('dialog form')!.dispatchEvent(new Event('submit'));
    expectApi('POST', '/admin/inventory/adjustments').flush({
      data: item('a', { onHand: 15, available: 13 }),
    });
    await f.whenStable();
    expect(el.querySelector('app-adjust-stock-dialog')).toBeNull();
    expect(el.querySelector('tbody tr')!.textContent).toContain('۱۵');
  });

  it('shows the error state and retries', async () => {
    signIn();
    const f = TestBed.createComponent(InventoryListPage);
    await f.whenStable();
    expectApi('GET', '/admin/inventory').flush({ detail: 'قطع' }, { status: 500, statusText: 'x' });
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role=alert]')?.textContent).toContain('قطع');
    el.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    expectApi('GET', '/admin/inventory').flush(page([]));
  });
});
