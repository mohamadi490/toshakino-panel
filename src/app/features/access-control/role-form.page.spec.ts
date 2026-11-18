import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RoleRead } from '../../core/api/schemas';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { expectApi, signIn } from '../../../testing/api-test-utils';
import { RoleFormPage } from './role-form.page';

const CATALOG = [
  { code: 'orders.read', description: 'مشاهده سفارش‌ها' },
  { code: 'orders.update', description: 'ویرایش سفارش‌ها' },
  { code: 'products.read', description: 'مشاهده محصولات' },
];
const role = (over: Partial<RoleRead> = {}): RoleRead => ({
  id: 5,
  name: 'پشتیبان',
  description: 'تیم پشتیبانی',
  isSystem: false,
  isStaff: true,
  permissions: ['orders.read'],
  ...over,
});
const FULL = Object.values(Permissions);

function fill(el: HTMLElement, selector: string, value: string) {
  const n = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  n.value = value;
  n.dispatchEvent(new Event('input'));
}

describe('RoleFormPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function create() {
    signIn(FULL);
    const f = TestBed.createComponent(RoleFormPage);
    await f.whenStable();
    expectApi('GET', '/admin/permissions').flush({ data: CATALOG });
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement };
  }
  async function edit(r = role(), perms: string[] = FULL) {
    signIn(perms);
    const f = TestBed.createComponent(RoleFormPage);
    f.componentRef.setInput('id', String(r.id));
    await f.whenStable();
    expectApi('GET', '/admin/permissions').flush({ data: CATALOG });
    expectApi('GET', '/admin/roles').flush({ data: [r] });
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement };
  }

  it('groups the catalog by resource prefix and shows code + description', async () => {
    const { el } = await create();
    const legends = Array.from(el.querySelectorAll('legend')).map((l) => l.textContent!.trim());
    expect(legends).toEqual(['orders', 'products']);
    expect(el.textContent).toContain('مشاهده سفارش‌ها');
    expect(el.textContent).toContain('orders.update');
  });

  it('create: sends sorted permissions, isStaff and omits an empty description', async () => {
    const { f, el } = await create();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#name', ' پشتیبان ');
    el.querySelector<HTMLInputElement>('fieldset input[type=checkbox]')!.click(); // select all orders.*
    el.querySelectorAll<HTMLInputElement>('fieldset')[1]!
      .querySelectorAll<HTMLInputElement>('input[type=checkbox]')[1]!
      .click(); // products.read
    await f.whenStable();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = expectApi('POST', '/admin/roles');
    expect(req.request.body).toEqual({
      name: 'پشتیبان',
      permissions: ['orders.read', 'orders.update', 'products.read'],
      isStaff: true,
    });
    req.flush({ data: role() });
  });

  it('create: validates the name length from the contract (2-50)', async () => {
    const { f, el } = await create();
    fill(el, '#name', 'a');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(el.querySelector('#name-err')!.textContent).toContain('حداقل 2 کاراکتر');
  });

  it('create: a customer role can be created by turning isStaff off', async () => {
    const { f, el } = await create();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#name', 'مشتری ویژه');
    el.querySelector<HTMLInputElement>('input[formControlName=isStaff]')!.click();
    await f.whenStable();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = expectApi('POST', '/admin/roles');
    expect((req.request.body as { isStaff: boolean }).isStaff).toBe(false);
    req.flush({ data: role() });
  });

  it('create: role_name_taken lands on the name field in Persian', async () => {
    const { f, el } = await create();
    fill(el, '#name', 'مدیر');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expectApi('POST', '/admin/roles').flush(
      { code: 'role_name_taken' },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expect(el.querySelector('#name-err')!.textContent).toContain(
      'نام این نقش قبلاً استفاده شده است.',
    );
  });

  it('create: an unknown_permission error is explained in Persian', async () => {
    const { f, el } = await create();
    fill(el, '#name', 'مدیر');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expectApi('POST', '/admin/roles').flush(
      { code: 'unknown_permission' },
      { status: 422, statusText: 'x' },
    );
    await f.whenStable();
    expect(el.textContent).toContain('مجوز نامعتبر');
  });

  it('edit: preloads the role from the list (no GET by id exists) and checks its permissions', async () => {
    const { el } = await edit();
    expect(el.querySelector<HTMLInputElement>('#name')!.value).toBe('پشتیبان');
    const checked = Array.from(
      el.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked'),
    );
    expect(checked.length).toBe(2); // isStaff + orders.read
  });

  it('edit: says nothing was changed and sends no request', async () => {
    const { f, el } = await edit();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(TestBed.inject(NotificationService).toasts().at(-1)?.message).toBe(
      'تغییری برای ذخیره وجود ندارد.',
    );
  });

  it('edit: sends only the changed fields', async () => {
    const { f, el } = await edit();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#name', 'پشتیبان ارشد');
    el.querySelectorAll<HTMLInputElement>('fieldset')[0]!
      .querySelectorAll<HTMLInputElement>('input[type=checkbox]')[2]!
      .click(); // orders.update
    await f.whenStable();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = expectApi('PATCH', '/admin/roles/5');
    expect(req.request.body).toEqual({
      name: 'پشتیبان ارشد',
      permissions: ['orders.read', 'orders.update'],
    });
    req.flush({ data: role() });
  });

  it('edit: clearing the description sends an explicit null', async () => {
    const { f, el } = await edit();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#description', '');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = expectApi('PATCH', '/admin/roles/5');
    expect(req.request.body).toEqual({ description: null });
    req.flush({ data: role() });
    await f.whenStable();
  });

  it('edit: warns on system roles and shows role_protected from the server', async () => {
    const { f, el } = await edit(role({ isSystem: true }));
    expect(el.textContent).toContain('نقش سیستمی');
    fill(el, '#name', 'نام جدید');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expectApi('PATCH', '/admin/roles/5').flush(
      { code: 'role_protected' },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expect(el.textContent).toContain('نقش سیستمی قابل تغییر یا حذف نیست.');
  });

  it('edit: is read-only without roles.update', async () => {
    const { el } = await edit(role(), [Permissions.RolesRead]);
    expect(el.querySelector<HTMLInputElement>('#name')!.disabled).toBe(true);
    expect(el.querySelector('button[type=submit]')).toBeNull();
  });

  it('shows not-found for an unknown role id', async () => {
    signIn(FULL);
    const f = TestBed.createComponent(RoleFormPage);
    f.componentRef.setInput('id', '404');
    await f.whenStable();
    expectApi('GET', '/admin/permissions').flush({ data: CATALOG });
    expectApi('GET', '/admin/roles').flush({ data: [] });
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).textContent).toContain('پیدا نشد');
  });

  it('shows a load error when the catalog cannot be fetched', async () => {
    signIn(FULL);
    const f = TestBed.createComponent(RoleFormPage);
    await f.whenStable();
    expectApi('GET', '/admin/permissions').flush(
      { code: 'permission_denied' },
      { status: 403, statusText: 'x' },
    );
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).textContent).toContain(
      'اجازه انجام این عملیات را ندارید.',
    );
  });
});
