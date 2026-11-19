import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { UserRead } from '../../core/api/schemas';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { expectApi, signIn, testUser } from '../../../testing/api-test-utils';
import { UserFormPage } from './user-form.page';

const ROLES = [
  {
    id: 2,
    name: 'مدیر محتوا',
    description: null,
    isSystem: false,
    isStaff: true,
    permissions: ['pages.read'],
  },
  { id: 9, name: 'مشتری', description: null, isSystem: true, isStaff: false, permissions: [] },
];
const FULL = Object.values(Permissions);

function fill(el: HTMLElement, selector: string, value: string, event = 'input') {
  const node = el.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
  node.value = value;
  node.dispatchEvent(new Event(event));
}

describe('UserFormPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function create(perms: string[] = FULL) {
    signIn(perms);
    const f = TestBed.createComponent(UserFormPage);
    await f.whenStable();
    if (perms.includes(Permissions.RolesRead))
      expectApi('GET', '/admin/roles').flush({ data: ROLES });
    await f.whenStable();
    return {
      f,
      el: f.nativeElement as HTMLElement,
      form: () => f.nativeElement.querySelector('form') as HTMLFormElement,
    };
  }

  async function edit(u: UserRead, perms: string[] = FULL, me = 1) {
    signIn(perms, me);
    const f = TestBed.createComponent(UserFormPage);
    f.componentRef.setInput('id', String(u.id));
    await f.whenStable();
    if (perms.includes(Permissions.RolesRead))
      expectApi('GET', '/admin/roles').flush({ data: ROLES });
    expectApi('GET', `/admin/users/${u.id}`).flush({ data: u });
    await f.whenStable();
    return {
      f,
      el: f.nativeElement as HTMLElement,
      form: () => f.nativeElement.querySelector('form') as HTMLFormElement,
    };
  }
  const existing = (over: Partial<UserRead> = {}): UserRead => ({
    ...testUser(['pages.read', 'orders.read'], 10),
    fullName: 'سارا',
    email: 's@x.ir',
    username: 'sara',
    mobile: '09121234567',
    role: { id: 2, name: 'مدیر محتوا', isStaff: true },
    ...over,
  });

  it('create: sends only filled identifiers, trims, normalises Persian-digit mobile, numeric roleId', async () => {
    const { f, el, form } = await create();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#fullName', ' علی ');
    fill(el, '#mobile', '۰۹۱۲۳۴۵۶۷۸۹');
    fill(el, '#password', 'a-long-password');
    fill(el, '#roleId', '2', 'change');
    form().dispatchEvent(new Event('submit'));
    const req = expectApi('POST', '/admin/users');
    expect(req.request.body).toEqual({
      fullName: 'علی',
      mobile: '09123456789',
      password: 'a-long-password',
      roleId: 2,
    });
    req.flush({ data: existing() });
    await f.whenStable();
  });

  it('create: requires at least one identifier', async () => {
    const { f, el, form } = await create();
    fill(el, '#password', 'a-long-password');
    fill(el, '#roleId', '2', 'change');
    form().dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(el.textContent).toContain('حداقل یکی از ایمیل، نام کاربری یا موبایل');
  });

  it.each([
    ['username', 'Bad Name', 'قالب واردشده معتبر نیست'],
    ['username', 'ab', 'قالب واردشده معتبر نیست'],
    ['email', 'not-an-email', 'قالب واردشده معتبر نیست'],
    ['mobile', '12345', 'قالب واردشده معتبر نیست'],
  ])('create: rejects invalid %s "%s" (contract patterns)', async (field, value, message) => {
    const { f, el, form } = await create();
    fill(el, `#${field}`, value);
    fill(el, '#email', field === 'email' ? value : 'ok@x.ir');
    fill(el, '#password', 'a-long-password');
    fill(el, '#roleId', '2', 'change');
    form().dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(el.textContent).toContain(message);
  });

  it('create: password must be 8-128 characters', async () => {
    const { f, el, form } = await create();
    fill(el, '#email', 'a@x.ir');
    fill(el, '#password', 'short');
    fill(el, '#roleId', '2', 'change');
    form().dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(el.querySelector('#password-err')!.textContent).toContain('حداقل 8 کاراکتر');
  });

  it('create: a role is required', async () => {
    const { f, el, form } = await create();
    fill(el, '#email', 'a@x.ir');
    fill(el, '#password', 'a-long-password');
    form().dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(el.textContent).toContain('این فیلد الزامی است.');
  });

  it('create: ignores a second submit while the first is in flight', async () => {
    const { el, form } = await create();
    fill(el, '#email', 'a@x.ir');
    fill(el, '#password', 'a-long-password');
    fill(el, '#roleId', '2', 'change');
    form().dispatchEvent(new Event('submit'));
    form().dispatchEvent(new Event('submit'));
    expectApi('POST', '/admin/users').flush(
      { code: 'internal_error' },
      { status: 500, statusText: 'x' },
    );
  });

  it('create: puts email_taken on the email field', async () => {
    const { f, el, form } = await create();
    fill(el, '#email', 'dup@x.ir');
    fill(el, '#password', 'a-long-password');
    fill(el, '#roleId', '2', 'change');
    form().dispatchEvent(new Event('submit'));
    expectApi('POST', '/admin/users').flush(
      { code: 'email_taken', detail: 'English' },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expect(el.textContent).toContain('این ایمیل قبلاً ثبت شده است.');
    expect(el.textContent).not.toContain('English');
  });

  it('create: maps contract fieldErrors[] onto controls', async () => {
    const { f, el, form } = await create();
    fill(el, '#email', 'a@x.ir');
    fill(el, '#password', 'a-long-password');
    fill(el, '#roleId', '2', 'change');
    form().dispatchEvent(new Event('submit'));
    expectApi('POST', '/admin/users').flush(
      {
        code: 'validation_error',
        fieldErrors: [{ field: 'password', code: 'string_too_short', message: 'too short' }],
      },
      { status: 422, statusText: 'x' },
    );
    await f.whenStable();
    expect(el.querySelector('#password-err')!.textContent).toContain('کوتاه‌تر');
  });

  it('create: without roles.read it warns that a role cannot be chosen', async () => {
    const { el } = await create([Permissions.UsersWrite]);
    expect(el.textContent).toContain('به دسترسی مشاهده نقش‌ها نیاز دارید');
  });

  it('edit: shows identifiers read-only, current role, and effective permissions grouped by resource', async () => {
    const { el } = await edit(existing());
    expect(el.querySelector<HTMLInputElement>('#email')!.disabled).toBe(true);
    expect(el.querySelector<HTMLInputElement>('#username')!.value).toBe('sara');
    expect(el.querySelector<HTMLSelectElement>('#roleId')!.value).toBe('2');
    expect(el.textContent).toContain('orders.read');
    expect(el.textContent).toContain('pages');
  });

  it('edit: sends nothing and says so when nothing changed', async () => {
    const { f, form } = await edit(existing());
    form().dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(TestBed.inject(NotificationService).toasts().at(-1)?.message).toBe(
      'تغییری برای ذخیره وجود ندارد.',
    );
  });

  it('edit: sends only changed fields (name, role, active, newPassword)', async () => {
    const { f, el, form } = await edit(existing());
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#fullName', 'سارا م');
    fill(el, '#roleId', '9', 'change');
    el.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
    fill(el, '#password', 'brand-new-secret');
    await f.whenStable();
    form().dispatchEvent(new Event('submit'));
    const req = expectApi('PATCH', '/admin/users/10');
    expect(req.request.body).toEqual({
      fullName: 'سارا م',
      roleId: 9,
      isActive: false,
      newPassword: 'brand-new-secret',
    });
    req.flush({ data: existing() });
  });

  it('edit: clearing the name sends an explicit null', async () => {
    const { f, el, form } = await edit(existing());
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#fullName', '');
    await f.whenStable();
    form().dispatchEvent(new Event('submit'));
    const req = expectApi('PATCH', '/admin/users/10');
    expect(req.request.body).toEqual({ fullName: null });
    req.flush({ data: existing() });
  });

  it('edit: the current user cannot change their own role or status', async () => {
    const { el } = await edit(existing({ id: 1 }), FULL, 1);
    expect(el.querySelector<HTMLSelectElement>('#roleId')!.disabled).toBe(true);
    expect(el.textContent).toContain('این حساب خودِ شماست');
  });

  it('edit: surfaces cannot_modify_self from the server in Persian', async () => {
    const { f, el, form } = await edit(existing());
    fill(el, '#fullName', 'x');
    await f.whenStable();
    form().dispatchEvent(new Event('submit'));
    expectApi('PATCH', '/admin/users/10').flush(
      { code: 'cannot_modify_self' },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expect(el.textContent).toContain('نمی‌توانید حساب خودتان را به این شکل تغییر دهید.');
  });

  it('edit: is read-only without users.update and hides save', async () => {
    const { el } = await edit(existing(), [Permissions.UsersRead]);
    expect(el.querySelector<HTMLInputElement>('#fullName')!.disabled).toBe(true);
    expect(el.querySelector('button[type=submit]')).toBeNull();
  });

  it('edit: without roles.read it still shows the current role', async () => {
    const { el } = await edit(existing(), [Permissions.UsersRead, Permissions.UsersWrite]);
    expect(el.querySelector<HTMLSelectElement>('#roleId')!.textContent).toContain('مدیر محتوا');
  });

  it('shows the Persian load error for an unknown user', async () => {
    signIn(FULL);
    const f = TestBed.createComponent(UserFormPage);
    f.componentRef.setInput('id', '999');
    await f.whenStable();
    expectApi('GET', '/admin/roles').flush({ data: ROLES });
    expectApi('GET', '/admin/users/999').flush(
      { code: 'user_not_found' },
      { status: 404, statusText: 'x' },
    );
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).textContent).toContain('کاربر پیدا نشد.');
  });
});
