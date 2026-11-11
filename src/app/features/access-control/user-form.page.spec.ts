import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Permissions } from '../../core/authorization/permissions';
import { UserFormPage } from './user-form.page';
import { expectApi, page, signIn } from '../../../testing/api-test-utils';

const ROLES = page([{ id: 'r1', name: 'مدیر', isSystem: false, permissions: [] }]);

function fill(el: HTMLElement, id: string, value: string) {
  const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('UserFormPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function create(perms = Object.values(Permissions)) {
    signIn(perms);
    const f = TestBed.createComponent(UserFormPage);
    await f.whenStable();
    if (perms.includes(Permissions.RolesRead) && perms.includes(Permissions.RolesAssign))
      expectApi('GET', '/admin/roles').flush(ROLES);
    await f.whenStable();
    return f;
  }

  it('blocks submit when neither email nor mobile is given and sends nothing', async () => {
    const f = await create();
    const el = f.nativeElement as HTMLElement;
    fill(el, 'displayName', 'علی');
    fill(el, 'password', 'a-very-long-password');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(el.textContent).toContain('حداقل یکی از ایمیل یا موبایل');
  });

  it('creates a user with normalised mobile digits and selected roles', async () => {
    const f = await create();
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const el = f.nativeElement as HTMLElement;
    fill(el, 'displayName', ' علی ');
    fill(el, 'mobile', '۰۹۱۲۳۴۵۶۷۸۹');
    fill(el, 'password', 'a-very-long-password');
    el.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = expectApi('POST', '/admin/users');
    expect(req.request.body).toEqual({
      displayName: 'علی',
      mobile: '09123456789',
      password: 'a-very-long-password',
      roleIds: ['r1'],
    });
    req.flush({ data: { id: 'n' } });
    expect(nav).toHaveBeenCalledWith(['/access/users']);
  });

  it('ignores a second submit while the first is in flight', async () => {
    const f = await create();
    const el = f.nativeElement as HTMLElement;
    fill(el, 'displayName', 'علی');
    fill(el, 'email', 'a@b.ir');
    fill(el, 'password', 'a-very-long-password');
    const form = el.querySelector('form')!;
    form.dispatchEvent(new Event('submit'));
    form.dispatchEvent(new Event('submit'));
    expectApi('POST', '/admin/users').flush({}, { status: 500, statusText: 'x' }); // exactly one request (verify() enforces)
  });

  it('maps backend field errors onto the form', async () => {
    const f = await create();
    const el = f.nativeElement as HTMLElement;
    fill(el, 'displayName', 'علی');
    fill(el, 'email', 'dup@b.ir');
    fill(el, 'password', 'a-very-long-password');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expectApi('POST', '/admin/users').flush(
      { code: 'validation_error', fieldErrors: { email: ['این ایمیل قبلاً ثبت شده است.'] } },
      { status: 422, statusText: 'x' },
    );
    await f.whenStable();
    expect(el.textContent).toContain('این ایمیل قبلاً ثبت شده است.');
  });

  it('hides role assignment without roles.assign', async () => {
    const f = await create([Permissions.UsersCreate]);
    expect((f.nativeElement as HTMLElement).textContent).not.toContain('نقش‌ها');
  });

  it('edit mode shows effective permissions and sends no roleIds without roles.assign', async () => {
    signIn([Permissions.UsersRead, Permissions.UsersUpdate]);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const f = TestBed.createComponent(UserFormPage);
    f.componentRef.setInput('id', 'u1');
    await f.whenStable();
    expectApi('GET', '/admin/users/u1').flush({
      data: {
        id: 'u1',
        displayName: 'سارا',
        email: 's@x.ir',
        mobile: null,
        isActive: true,
        roles: [],
        createdAt: 'x',
        effectivePermissions: ['orders.read'],
      },
    });
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.textContent).toContain('orders.read');
    fill(el, 'displayName', 'سارا م');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const patch = expectApi('PATCH', '/admin/users/u1');
    expect(patch.request.body).toEqual({ displayName: 'سارا م', email: 's@x.ir', mobile: null });
    patch.flush({ data: {} });
  });

  it('is read-only without users.update', async () => {
    signIn([Permissions.UsersRead]);
    const f = TestBed.createComponent(UserFormPage);
    f.componentRef.setInput('id', 'u1');
    await f.whenStable();
    expectApi('GET', '/admin/users/u1').flush({
      data: {
        id: 'u1',
        displayName: 'x',
        isActive: true,
        roles: [],
        createdAt: 'x',
        effectivePermissions: [],
      },
    });
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector<HTMLInputElement>('#displayName')!.disabled).toBe(true);
    expect(el.querySelector('button[type=submit]')).toBeNull();
  });
});
