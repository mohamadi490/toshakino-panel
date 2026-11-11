import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Permissions } from '../../core/authorization/permissions';
import { expectApi, page, signIn } from '../../../testing/api-test-utils';
import { Category } from './catalog.models';
import { CategoriesListPage } from './categories-list.page';

const cat = (
  id: string,
  parentId: string | null,
  status: Category['status'] = 'published',
): Category => ({
  id,
  parentId,
  slug: id,
  title: `دسته ${id}`,
  status,
  sortOrder: 0,
  productCount: 3,
});

describe('CategoriesListPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('renders the tree with Persian status labels', async () => {
    signIn();
    const f = TestBed.createComponent(CategoriesListPage);
    await f.whenStable();
    expectApi('GET', '/admin/categories').flush(
      page([cat('child', 'root', 'draft'), cat('root', null)]),
    );
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    const rows = Array.from(el.querySelectorAll('tbody tr')).map((r) => r.textContent ?? '');
    expect(rows[0]).toContain('دسته root');
    expect(rows[1]).toContain('دسته child');
    expect(rows[1]).toContain('پیش‌نویس');
  });

  it('shows the error state and retries', async () => {
    signIn();
    const f = TestBed.createComponent(CategoriesListPage);
    await f.whenStable();
    expectApi('GET', '/admin/categories').flush(
      { detail: 'قطع شد' },
      { status: 500, statusText: 'x' },
    );
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role=alert]')?.textContent).toContain('قطع شد');
    el.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    expectApi('GET', '/admin/categories').flush(page([]));
  });

  it('hides "new" without categories.manage', async () => {
    signIn([Permissions.CategoriesRead]);
    const f = TestBed.createComponent(CategoriesListPage);
    await f.whenStable();
    expectApi('GET', '/admin/categories').flush(page([]));
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).textContent).not.toContain('دسته‌بندی جدید');
  });
});
