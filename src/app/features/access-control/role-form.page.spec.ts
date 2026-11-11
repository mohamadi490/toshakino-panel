import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RoleFormPage } from './role-form.page';
import { expectApi, page, signIn } from '../../../testing/api-test-utils';

const CATALOG = [
  { key: 'orders.read', group: 'سفارش‌ها', label: 'مشاهده سفارش' },
  { key: 'orders.cancel', group: 'سفارش‌ها', label: 'لغو سفارش' },
  { key: 'users.read', group: 'کاربران' },
];

describe('RoleFormPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('creates a role with sorted, de-duplicated permissions (group select-all)', async () => {
    signIn();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const f = TestBed.createComponent(RoleFormPage);
    await f.whenStable();
    expectApi('GET', '/admin/permissions').flush({ data: CATALOG });
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    const name = el.querySelector<HTMLInputElement>('#name')!;
    name.value = 'پشتیبان';
    name.dispatchEvent(new Event('input'));
    // first fieldset's "select all", then a single permission from the second group
    el.querySelector<HTMLInputElement>('fieldset input[type=checkbox]')!.click();
    el.querySelectorAll<HTMLInputElement>('fieldset')[1]!
      .querySelectorAll<HTMLInputElement>('input[type=checkbox]')[1]!
      .click();
    await f.whenStable();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = expectApi('POST', '/admin/roles');
    expect(req.request.body).toEqual({
      name: 'پشتیبان',
      description: null,
      permissions: ['orders.cancel', 'orders.read', 'users.read'],
    });
    req.flush({ data: {} });
  });

  it('locks the name of system roles and preloads their permissions', async () => {
    signIn();
    const f = TestBed.createComponent(RoleFormPage);
    f.componentRef.setInput('id', 'r1');
    await f.whenStable();
    expectApi('GET', '/admin/permissions').flush({ data: CATALOG });
    expectApi('GET', '/admin/roles').flush(
      page([{ id: 'r1', name: 'مدیرکل', isSystem: true, permissions: ['users.read'] }]),
    );
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector<HTMLInputElement>('#name')!.disabled).toBe(true);
    expect(el.textContent).toContain('نقش سیستمی');
    const checked = Array.from(
      el.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked'),
    );
    expect(checked.length).toBe(2); // users.read + the "users" group select-all
  });

  it('shows a not-found message for an unknown role id', async () => {
    signIn();
    const f = TestBed.createComponent(RoleFormPage);
    f.componentRef.setInput('id', 'zzz');
    await f.whenStable();
    expectApi('GET', '/admin/permissions').flush({ data: CATALOG });
    expectApi('GET', '/admin/roles').flush(page([]));
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).textContent).toContain('پیدا نشد');
  });
});
