import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Permissions } from '../../core/authorization/permissions';
import { expectApi, page, signIn } from '../../../testing/api-test-utils';
import { Category } from './catalog.models';
import { CategoryFormPage } from './category-form.page';

const cat = (id: string, parentId: string | null): Category => ({
  id,
  parentId,
  slug: id,
  title: `دسته ${id}`,
  status: 'published',
  sortOrder: 1,
});

function fill(el: HTMLElement, id: string, value: string) {
  const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('CategoryFormPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function create() {
    signIn();
    const f = TestBed.createComponent(CategoryFormPage);
    await f.whenStable();
    expectApi('GET', '/admin/categories').flush(page([cat('root', null)]));
    await f.whenStable();
    return f;
  }

  it('creates a category with a normalised payload', async () => {
    const f = await create();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const el = f.nativeElement as HTMLElement;
    fill(el, 'title', ' تشک طبی ');
    fill(el, 'slug', 'medical-mattress');
    const parent = el.querySelector<HTMLSelectElement>('#parentId')!;
    parent.value = 'root';
    parent.dispatchEvent(new Event('change'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = expectApi('POST', '/admin/categories');
    expect(req.request.body).toEqual({
      parentId: 'root',
      slug: 'medical-mattress',
      title: 'تشک طبی',
      description: null,
      status: 'draft',
      sortOrder: 0,
      seoTitle: null,
      seoDescription: null,
      canonicalUrl: null,
    });
    req.flush({ data: {} });
  });

  it('blocks submit for an invalid slug', async () => {
    const f = await create();
    const el = f.nativeElement as HTMLElement;
    fill(el, 'title', 'x');
    fill(el, 'slug', 'Bad Slug');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(el.textContent).toContain('حروف کوچک انگلیسی');
  });

  it('rejects a non-https canonical URL', async () => {
    const f = await create();
    const el = f.nativeElement as HTMLElement;
    fill(el, 'title', 'x');
    fill(el, 'slug', 'x');
    fill(el, 'canonicalUrl', 'http://evil.example');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(el.textContent).toContain('قالب واردشده معتبر نیست');
  });

  it('shows a backend slug conflict on the slug field', async () => {
    const f = await create();
    const el = f.nativeElement as HTMLElement;
    fill(el, 'title', 'x');
    fill(el, 'slug', 'taken');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expectApi('POST', '/admin/categories').flush(
      { code: 'slug_conflict', fieldErrors: { slug: ['این اسلاگ قبلاً استفاده شده است.'] } },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expect(el.textContent).toContain('این اسلاگ قبلاً استفاده شده است.');
  });

  it('edit mode excludes the category and its descendants from the parent choices', async () => {
    signIn();
    const f = TestBed.createComponent(CategoryFormPage);
    f.componentRef.setInput('id', 'a');
    await f.whenStable();
    expectApi('GET', '/admin/categories').flush(
      page([cat('a', null), cat('b', 'a'), cat('c', 'b'), cat('z', null)]),
    );
    await f.whenStable();
    const options = Array.from(
      (f.nativeElement as HTMLElement).querySelectorAll<HTMLOptionElement>('#parentId option'),
    ).map((o) => o.value);
    expect(options).toEqual(['', 'z']);
    expect((f.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#slug')!.value).toBe(
      'a',
    );
  });

  it('is read-only without categories.manage and reports an unknown id', async () => {
    signIn([Permissions.CategoriesRead]);
    const f = TestBed.createComponent(CategoryFormPage);
    f.componentRef.setInput('id', 'a');
    await f.whenStable();
    expectApi('GET', '/admin/categories').flush(page([cat('a', null)]));
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector<HTMLInputElement>('#title')!.disabled).toBe(true);
    expect(el.querySelector('button[type=submit]')).toBeNull();

    const g = TestBed.createComponent(CategoryFormPage);
    g.componentRef.setInput('id', 'nope');
    await g.whenStable();
    expectApi('GET', '/admin/categories').flush(page([]));
    await g.whenStable();
    expect((g.nativeElement as HTMLElement).textContent).toContain('پیدا نشد');
  });
});
