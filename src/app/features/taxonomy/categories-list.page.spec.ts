import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationService } from '../../core/error-handling/notification.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { expectApi, signIn } from '../../../testing/api-test-utils';
import { CategoriesListPage } from './categories-list.page';
import { category } from './fixtures';

describe('CategoriesListPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    signIn();
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function open(items = [category(1), category(2, { parentId: 1, status: 'draft' })]) {
    const f = TestBed.createComponent(CategoriesListPage);
    await f.whenStable();
    const req = expectApi('GET', '/admin/categories');
    req.flush({ data: items });
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement, req };
  }
  const rows = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('tbody tr')).map((r) => r.textContent!);

  it('lists active categories (no deleted filter) as a tree with Persian status', async () => {
    const { el, req } = await open([category(2, { parentId: 1, status: 'draft' }), category(1)]);
    expect(req.request.params.has('deleted')).toBe(false);
    const r = rows(el);
    expect(r[0]).toContain('دسته 1');
    expect(r[1]).toContain('دسته 2');
    expect(r[1]).toContain('پیش‌نویس');
    expect(r[0]).toContain('منتشرشده');
  });

  it('switches to the deleted view with deleted=true and offers restore instead of delete', async () => {
    const { f, el } = await open();
    Array.from(el.querySelectorAll<HTMLButtonElement>('app-segmented button'))
      .find((b) => b.textContent!.includes('حذف‌شده'))!
      .click();
    await f.whenStable();
    const req = expectApi('GET', '/admin/categories');
    expect(req.request.params.get('deleted')).toBe('true');
    req.flush({ data: [category(7, { deletedAt: '2026-02-01T00:00:00Z' })] });
    await f.whenStable();
    expect(el.querySelector('tbody button')!.textContent).toContain('بازیابی');
  });

  it('shows an empty state', async () => {
    const { el } = await open([]);
    expect(el.textContent).toContain('هنوز دسته‌بندی‌ای ثبت نشده است.');
  });

  it('asks before deleting and sends nothing when declined', async () => {
    const { f, el } = await open([category(1)]);
    const spy = vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(false);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
    expect(spy).toHaveBeenCalled(); // verify() fails if a DELETE was sent
  });

  it('deletes after confirmation (204) and reloads', async () => {
    const { f, el } = await open([category(1)]);
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
    expectApi('DELETE', '/admin/categories/1').flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    expectApi('GET', '/admin/categories').flush({ data: [] });
  });

  it.each([
    ['category_not_empty', 'دسته‌بندی محصول دارد و حذف نمی‌شود.'],
    ['category_has_children', 'دسته‌بندی زیرمجموعه دارد و حذف نمی‌شود.'],
  ])('explains %s with its own Persian message', async (code, message) => {
    const { f, el } = await open([category(1)]);
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
    expectApi('DELETE', '/admin/categories/1').flush({ code }, { status: 409, statusText: 'x' });
    await f.whenStable();
    expect(TestBed.inject(NotificationService).toasts().at(-1)?.message).toBe(message);
  });

  it('restores a deleted category and reloads; a slug clash is explained', async () => {
    const { f, el } = await open();
    Array.from(el.querySelectorAll<HTMLButtonElement>('app-segmented button'))
      .find((b) => b.textContent!.includes('حذف‌شده'))!
      .click();
    await f.whenStable();
    expectApi('GET', '/admin/categories').flush({ data: [category(7, { deletedAt: 'x' })] });
    await f.whenStable();
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    expectApi('POST', '/admin/categories/7/restore').flush(
      { code: 'slug_taken' },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expect(TestBed.inject(NotificationService).toasts().at(-1)?.message).toBe(
      'این اسلاگ قبلاً استفاده شده است.',
    );
  });

  it('shows the error state and retries', async () => {
    const f = TestBed.createComponent(CategoriesListPage);
    await f.whenStable();
    expectApi('GET', '/admin/categories').flush(
      { code: 'internal_error' },
      { status: 500, statusText: 'x' },
    );
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role=alert]')!.textContent).toContain('خطایی در سرور');
    el.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    expectApi('GET', '/admin/categories').flush({ data: [] });
  });
});
