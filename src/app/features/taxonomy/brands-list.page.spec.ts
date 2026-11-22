import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationService } from '../../core/error-handling/notification.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { expectApi, signIn } from '../../../testing/api-test-utils';
import { BrandsListPage } from './brands-list.page';
import { brand } from './fixtures';

describe('BrandsListPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    signIn();
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function open(
    items = [brand(2, { name: 'ب' }), brand(1, { name: 'الف', description: 'توضیح' })],
  ) {
    const f = TestBed.createComponent(BrandsListPage);
    await f.whenStable();
    const req = expectApi('GET', '/admin/brands');
    req.flush({ data: items });
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement, req };
  }

  it('lists brands sorted by Persian name with a description fallback', async () => {
    const { el, req } = await open();
    expect(req.request.params.has('deleted')).toBe(false);
    const rows = Array.from(el.querySelectorAll('tbody tr')).map((r) => r.textContent!);
    expect(rows[0]).toContain('الف');
    expect(rows[0]).toContain('توضیح');
    expect(rows[1]).toContain('—');
  });

  it('shows the deleted brands with restore', async () => {
    const { f, el } = await open();
    Array.from(el.querySelectorAll<HTMLButtonElement>('app-segmented button'))
      .find((b) => b.textContent!.includes('حذف‌شده'))!
      .click();
    await f.whenStable();
    const req = expectApi('GET', '/admin/brands');
    expect(req.request.params.get('deleted')).toBe('true');
    req.flush({ data: [brand(3, { deletedAt: 'x' })] });
    await f.whenStable();
    expect(el.querySelector('tbody button')!.textContent).toContain('بازیابی');
  });

  it('deletes after confirmation and explains brand_not_empty', async () => {
    const { f, el } = await open([brand(1)]);
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
    expectApi('DELETE', '/admin/brands/1').flush(
      { code: 'brand_not_empty' },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expect(TestBed.inject(NotificationService).toasts().at(-1)?.message).toBe(
      'برند محصول دارد و حذف نمی‌شود.',
    );
  });

  it('does not delete when the confirmation is declined', async () => {
    const { f, el } = await open([brand(1)]);
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(false);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
  });

  it('shows the error state and retries', async () => {
    const f = TestBed.createComponent(BrandsListPage);
    await f.whenStable();
    expectApi('GET', '/admin/brands').flush(
      { code: 'internal_error' },
      { status: 500, statusText: 'x' },
    );
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    expectApi('GET', '/admin/brands').flush({ data: [] });
  });
});
