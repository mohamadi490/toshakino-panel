import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Permissions } from '../../core/authorization/permissions';
import { ConfirmService } from '../../shared/ui/confirm';
import { UsersListPage } from './users-list.page';
import { expectApi, page, signIn } from '../../../testing/api-test-utils';

const user = (id: string, isActive = true) => ({
  id,
  displayName: `کاربر ${id}`,
  email: `${id}@x.ir`,
  isActive,
  roles: [{ id: 'r', name: 'مدیر محتوا' }],
  createdAt: '2026-01-01T00:00:00Z',
});

describe('UsersListPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('loads users with server-side paging params and renders them', async () => {
    signIn();
    const f = TestBed.createComponent(UsersListPage);
    await f.whenStable();
    const req = expectApi('GET', '/admin/users');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('20');
    req.flush(page([user('a'), user('b', false)]));
    await f.whenStable();
    const text = (f.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('کاربر a');
    expect(text).toContain('غیرفعال');
  });

  it('shows an error state and retries', async () => {
    signIn();
    const f = TestBed.createComponent(UsersListPage);
    await f.whenStable();
    expectApi('GET', '/admin/users').flush(
      { detail: 'سرور خراب است' },
      { status: 500, statusText: 'x' },
    );
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role=alert]')?.textContent).toContain('سرور');
    el.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    expectApi('GET', '/admin/users').flush(page([user('a')]));
    await f.whenStable();
    expect(el.textContent).toContain('کاربر a');
  });

  it('hides the create action without users.create', async () => {
    signIn([Permissions.UsersRead]);
    const f = TestBed.createComponent(UsersListPage);
    await f.whenStable();
    expectApi('GET', '/admin/users').flush(page([]));
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).textContent).not.toContain('کاربر جدید');
  });

  it('does not offer to disable the current user and requires confirmation otherwise', async () => {
    signIn(Object.values(Permissions), 'me');
    const confirm = TestBed.inject(ConfirmService);
    const spy = vi.spyOn(confirm, 'confirm').mockResolvedValue(false);
    const f = TestBed.createComponent(UsersListPage);
    await f.whenStable();
    expectApi('GET', '/admin/users').flush(page([user('me'), user('other')]));
    await f.whenStable();
    const buttons = Array.from((f.nativeElement as HTMLElement).querySelectorAll('tbody button'));
    expect(buttons.length).toBe(1); // only for "other"
    (buttons[0] as HTMLButtonElement).click();
    await f.whenStable();
    expect(spy).toHaveBeenCalled(); // declined => no PATCH (verify() in afterEach would fail otherwise)
  });

  it('PATCHes isActive=false and reloads after the user confirms disabling', async () => {
    signIn();
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(true);
    const f = TestBed.createComponent(UsersListPage);
    await f.whenStable();
    expectApi('GET', '/admin/users').flush(page([user('other')]));
    await f.whenStable();
    (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
    const patch = expectApi('PATCH', '/admin/users/other');
    expect(patch.request.body).toEqual({ isActive: false });
    patch.flush({ data: user('other', false) });
    expectApi('GET', '/admin/users').flush(page([user('other', false)]));
  });
});
