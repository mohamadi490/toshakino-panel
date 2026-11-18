import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RoleRead } from '../../core/api/schemas';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { expectApi, signIn } from '../../../testing/api-test-utils';
import { RolesListPage } from './roles-list.page';

const role = (id: number, over: Partial<RoleRead> = {}): RoleRead => ({
  id,
  name: `نقش ${id}`,
  description: null,
  isSystem: false,
  isStaff: true,
  permissions: ['a.read', 'b.read'],
  ...over,
});

describe('RolesListPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function open(items: RoleRead[] = [role(2)], perms: string[] = Object.values(Permissions)) {
    signIn(perms);
    const f = TestBed.createComponent(RolesListPage);
    await f.whenStable();
    expectApi('GET', '/admin/roles').flush({ data: items });
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement };
  }

  it('lists roles with type, description fallback and permission count', async () => {
    const { el } = await open([
      role(2),
      role(9, { isStaff: false, description: 'خریداران', isSystem: true }),
    ]);
    const rows = Array.from(el.querySelectorAll('tbody tr')).map((r) => r.textContent!);
    expect(rows[0]).toContain('کارمند');
    expect(rows[0]).toContain('—');
    expect(rows[0]).toContain('۲');
    expect(rows[1]).toContain('مشتری');
    expect(rows[1]).toContain('خریداران');
    expect(rows[1]).toContain('سیستمی');
  });

  it('offers delete only for non-system roles and only with the permission', async () => {
    const withPerm = await open([role(2), role(9, { isSystem: true })]);
    expect(withPerm.el.querySelectorAll('tbody button').length).toBe(1);
  });

  it('hides delete and create without permission', async () => {
    const { el } = await open([role(2)], [Permissions.RolesRead]);
    expect(el.querySelector('tbody button')).toBeNull();
    expect(el.textContent).not.toContain('نقش جدید');
  });

  it('does nothing when the confirmation is declined', async () => {
    const { f, el } = await open();
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(false);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable(); // verify() fails if a DELETE was sent
  });

  it('deletes after confirmation (204) and reloads', async () => {
    const { f, el } = await open();
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
    expectApi('DELETE', '/admin/roles/2').flush(null, { status: 204, statusText: 'No Content' });
    expectApi('GET', '/admin/roles').flush({ data: [] });
    await f.whenStable();
    expect(el.textContent).toContain('نقشی تعریف نشده است.');
  });

  it('explains role_in_use in Persian and keeps the list', async () => {
    const { f, el } = await open();
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    await f.whenStable();
    expectApi('DELETE', '/admin/roles/2').flush(
      { code: 'role_in_use' },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expect(TestBed.inject(NotificationService).toasts().at(-1)?.message).toBe(
      'این نقش به کاربران اختصاص دارد و حذف نمی‌شود.',
    );
    expect(el.textContent).toContain('نقش 2');
  });

  it('shows the error state and retries', async () => {
    signIn();
    const f = TestBed.createComponent(RolesListPage);
    await f.whenStable();
    expectApi('GET', '/admin/roles').flush(
      { code: 'internal_error' },
      { status: 500, statusText: 'x' },
    );
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role=alert]')!.textContent).toContain('خطایی در سرور');
    el.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    expectApi('GET', '/admin/roles').flush({ data: [] });
  });
});
