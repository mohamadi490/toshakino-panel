import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { expectApi, signIn } from '../../../testing/api-test-utils';
import { AttributesListPage } from './attributes-list.page';
import { attribute } from './fixtures';

describe('AttributesListPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function open(
    perms: string[] = Object.values(Permissions),
    items = [
      attribute(2, { name: 'سایز', position: 1 }),
      attribute(1, { name: 'رنگ', position: 0 }),
    ],
  ) {
    signIn(perms);
    const f = TestBed.createComponent(AttributesListPage);
    await f.whenStable();
    expectApi('GET', '/admin/attributes').flush({ data: items });
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement };
  }

  it('lists attributes by position with their values and count', async () => {
    const { el } = await open();
    const rows = Array.from(el.querySelectorAll('tbody tr')).map((r) => r.textContent!);
    expect(rows[0]).toContain('رنگ');
    expect(rows[0]).toContain('الف، ب');
    expect(rows[0]).toContain('۲');
    expect(rows[1]).toContain('سایز');
  });

  it('read-only users (products.read only) see no create or delete actions', async () => {
    const { el } = await open([Permissions.ProductsRead]);
    expect(el.textContent).not.toContain('ویژگی جدید');
    expect(el.querySelector('tbody button')).toBeNull();
  });

  it('deletes after confirmation and explains attribute_in_use', async () => {
    const { f, el } = await open(Object.values(Permissions), [attribute(1)]);
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
    expectApi('DELETE', '/admin/attributes/1').flush(
      { code: 'attribute_in_use' },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expect(TestBed.inject(NotificationService).toasts().at(-1)?.message).toBe(
      'این ویژگی در محصولات استفاده شده و حذف نمی‌شود.',
    );
  });

  it('declined confirmation sends nothing', async () => {
    const { f, el } = await open(Object.values(Permissions), [attribute(1)]);
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(false);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
  });

  it('deleting (204) reloads the list', async () => {
    const { f, el } = await open(Object.values(Permissions), [attribute(1)]);
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
    expectApi('DELETE', '/admin/attributes/1').flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    expectApi('GET', '/admin/attributes').flush({ data: [] });
  });

  it('shows the error state and retries', async () => {
    signIn([Permissions.ProductsRead]);
    const f = TestBed.createComponent(AttributesListPage);
    await f.whenStable();
    expectApi('GET', '/admin/attributes').flush(
      { code: 'internal_error' },
      { status: 500, statusText: 'x' },
    );
    await f.whenStable();
    (f.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[role=alert] button')!
      .click();
    expectApi('GET', '/admin/attributes').flush({ data: [] });
  });
});
