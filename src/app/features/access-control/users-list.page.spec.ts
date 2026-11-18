import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserRead } from '../../core/api/schemas';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { expectApi, page, signIn, testUser } from '../../../testing/api-test-utils';
import { UsersListPage } from './users-list.page';

const user = (id: number, over: Partial<UserRead> = {}): UserRead => ({
  ...testUser([], id),
  email: `u${id}@x.ir`,
  username: `user${id}`,
  fullName: `کاربر ${id}`,
  role: { id: 2, name: 'مدیر محتوا', isStaff: true },
  ...over,
});
const ROLES = [
  { id: 2, name: 'مدیر محتوا', description: null, isSystem: false, isStaff: true, permissions: [] },
];

describe('UsersListPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function open(
    items: UserRead[] = [user(10), user(11, { isActive: false })],
    perms: string[] = Object.values(Permissions),
    me = 1,
  ) {
    signIn(perms, me);
    const f = TestBed.createComponent(UsersListPage);
    await f.whenStable();
    if (perms.includes(Permissions.RolesRead))
      expectApi('GET', '/admin/roles').flush({ data: ROLES });
    const req = expectApi('GET', '/admin/users');
    req.flush(page(items));
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement, req };
  }

  it('requests page 1 / 20 and renders name, identifiers, role badge and status', async () => {
    const { el, req } = await open();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('20');
    const rows = Array.from(el.querySelectorAll('tbody tr')).map((r) => r.textContent!);
    expect(rows[0]).toContain('کاربر 10');
    expect(rows[0]).toContain('user10');
    expect(rows[0]).toContain('مدیر محتوا');
    expect(rows[0]).toContain('کارمند');
    expect(rows[0]).toContain('فعال');
    expect(rows[1]).toContain('غیرفعال');
  });

  it('labels non-staff roles as customers', async () => {
    const { el } = await open([user(12, { role: { id: 9, name: 'مشتری', isStaff: false } })]);
    expect(el.querySelector('tbody tr')!.textContent).toContain('مشتری');
    expect(el.querySelector('tbody tr')!.textContent).not.toContain('کارمند');
  });

  it('falls back to the user id when there is no name at all', async () => {
    const { el } = await open([
      user(77, { fullName: null, username: null, email: null, mobile: null }),
    ]);
    expect(el.querySelector('tbody tr')!.textContent).toContain('#77');
    expect(el.querySelector('tbody tr')!.textContent).toContain('—');
  });

  it('sends the status and role filters and resets to page 1', async () => {
    const { f, el } = await open();
    const status = el.querySelector<HTMLSelectElement>('select[aria-label="وضعیت"]')!;
    status.value = 'inactive';
    status.dispatchEvent(new Event('change'));
    await f.whenStable();
    let req = expectApi('GET', '/admin/users');
    expect(req.request.params.get('isActive')).toBe('false');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(page([]));
    await f.whenStable();
    const role = el.querySelector<HTMLSelectElement>('select[aria-label="نقش"]')!;
    role.value = '2';
    role.dispatchEvent(new Event('change'));
    await f.whenStable();
    req = expectApi('GET', '/admin/users');
    expect(req.request.params.get('roleId')).toBe('2');
    req.flush(page([]));
  });

  it('hides the role filter without roles.read (list still works)', async () => {
    const { el } = await open([user(10)], [Permissions.UsersRead]);
    expect(el.querySelector('select[aria-label="نقش"]')).toBeNull();
  });

  it('hides the create action without users.create', async () => {
    const { el } = await open([user(10)], [Permissions.UsersRead]);
    expect(el.textContent).not.toContain('کاربر جدید');
  });

  it('never offers to disable the current user', async () => {
    const { el } = await open([user(1), user(10)], Object.values(Permissions), 1);
    expect(el.querySelectorAll('tbody button').length).toBe(1);
  });

  it('hides enable/disable without users.update', async () => {
    const { el } = await open([user(10)], [Permissions.UsersRead]);
    expect(el.querySelector('tbody button')).toBeNull();
  });

  it('asks for confirmation and sends nothing when declined', async () => {
    const { f, el } = await open([user(10)]);
    const spy = vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(false);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
    expect(spy).toHaveBeenCalled(); // verify() fails if a PATCH was made
  });

  it('PATCHes {isActive:false} after confirmation, then reloads', async () => {
    const { f, el } = await open([user(10)]);
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
    const patch = expectApi('PATCH', '/admin/users/10');
    expect(patch.request.body).toEqual({ isActive: false });
    patch.flush({ data: user(10, { isActive: false }) });
    expectApi('GET', '/admin/users').flush(page([user(10, { isActive: false })]));
  });

  it('shows the Persian message of the backend code when disabling is refused (last_super_admin)', async () => {
    const { f, el } = await open([user(10)]);
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
    expectApi('PATCH', '/admin/users/10').flush(
      { code: 'last_super_admin', detail: 'English' },
      { status: 409, statusText: 'Conflict' },
    );
    await f.whenStable();
    const toasts = TestBed.inject(NotificationService).toasts();
    expect(toasts.at(-1)?.message).toBe('آخرین مدیر کل را نمی‌توان غیرفعال یا تنزل داد.');
  });

  it('shows the error state and retries', async () => {
    signIn([Permissions.UsersRead]);
    const f = TestBed.createComponent(UsersListPage);
    await f.whenStable();
    expectApi('GET', '/admin/users').flush(
      { code: 'internal_error', traceId: 'tr-1' },
      { status: 500, statusText: 'x' },
    );
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role=alert]')!.textContent).toContain('tr-1');
    el.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    expectApi('GET', '/admin/users').flush(page([]));
  });
});
