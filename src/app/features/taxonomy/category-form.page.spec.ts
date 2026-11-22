import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { expectApi, signIn } from '../../../testing/api-test-utils';
import { CategoryFormPage } from './category-form.page';
import { category } from './fixtures';

function fill(el: HTMLElement, selector: string, value: string, event = 'input') {
  const n = el.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector)!;
  n.value = value;
  n.dispatchEvent(new Event(event));
}

describe('CategoryFormPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function create(perms: string[] = Object.values(Permissions)) {
    signIn(perms);
    const f = TestBed.createComponent(CategoryFormPage);
    await f.whenStable();
    expectApi('GET', '/admin/categories').flush({
      data: [category(1), category(2, { parentId: 1 })],
    });
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement };
  }
  async function edit(
    c = category(5, { description: 'توضیح', position: 3 }),
    all = [category(5), category(6, { parentId: 5 }), category(7), category(8, { parentId: 6 })],
    perms: string[] = Object.values(Permissions),
  ) {
    signIn(perms);
    const f = TestBed.createComponent(CategoryFormPage);
    f.componentRef.setInput('id', String(c.id));
    await f.whenStable();
    expectApi('GET', '/admin/categories').flush({ data: all });
    expectApi('GET', `/admin/categories/${c.id}`).flush({ data: c });
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement };
  }
  const submit = (el: HTMLElement) => el.querySelector('form')!.dispatchEvent(new Event('submit'));

  it('create: sends only filled fields; an empty slug is left out so the server derives it from the name', async () => {
    const { f, el } = await create();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#name', ' تشک طبی ');
    fill(el, '#parentId', '1', 'change');
    fill(el, '#position', '۲۰');
    submit(el);
    const req = expectApi('POST', '/admin/categories');
    expect(req.request.body).toEqual({
      name: 'تشک طبی',
      parentId: 1,
      status: 'draft',
      position: 20,
    });
    expect(Object.keys(req.request.body as object)).not.toContain('slug');
    req.flush({ data: category(9) });
    await f.whenStable();
  });

  it('create: accepts a Persian slug (the backend preserves unicode)', async () => {
    const { el } = await create();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#name', 'تشک');
    fill(el, '#slug', 'تشک-طبی');
    submit(el);
    const req = expectApi('POST', '/admin/categories');
    expect((req.request.body as { slug: string }).slug).toBe('تشک-طبی');
    req.flush({ data: category(9) });
  });

  it('create: requires a name and validates the contract limits and URLs', async () => {
    const { f, el } = await create();
    fill(el, '#imageUrl', 'ftp://x');
    fill(el, '#canonicalUrl', '/relative');
    fill(el, '#position', '-1');
    submit(el);
    await f.whenStable();
    expect(el.querySelector('#name-err')!.textContent).toContain('الزامی');
    expect(el.querySelector('#imageUrl-err')!.textContent).toContain('http');
    expect(el.querySelector('#canonicalUrl-err')!.textContent).toContain('http');
    expect(el.querySelector('#position-err')!.textContent).toContain('عدد صحیح');
  });

  it('create: slug_taken lands on the slug field in Persian', async () => {
    const { f, el } = await create();
    fill(el, '#name', 'x');
    fill(el, '#slug', 'taken');
    submit(el);
    expectApi('POST', '/admin/categories').flush(
      { code: 'slug_taken' },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expect(el.querySelector('#slug-err')!.textContent).toContain(
      'این اسلاگ قبلاً استفاده شده است.',
    );
  });

  it.each([
    ['category_cycle', 'نمی‌توان زیر خودش'],
    ['category_too_deep', 'عمق درخت'],
    ['parent_deleted', 'والد حذف شده'],
  ])('shows %s in Persian in the form summary', async (code, text) => {
    const { f, el } = await create();
    fill(el, '#name', 'x');
    submit(el);
    expectApi('POST', '/admin/categories').flush({ code }, { status: 409, statusText: 'x' });
    await f.whenStable();
    expect(el.querySelector('[role=alert]')!.textContent).toContain(text);
  });

  it('create: ignores a second submit while the first is in flight', async () => {
    const { el } = await create();
    fill(el, '#name', 'x');
    submit(el);
    submit(el);
    expectApi('POST', '/admin/categories').flush(
      { code: 'internal_error' },
      { status: 500, statusText: 'x' },
    );
  });

  it('edit: loads by id and excludes the category and its descendants from the parent choices', async () => {
    const { el } = await edit();
    expect(el.querySelector<HTMLInputElement>('#name')!.value).toBe('دسته 5');
    const options = Array.from(el.querySelectorAll<HTMLOptionElement>('#parentId option')).map(
      (o) => o.value,
    );
    expect(options).toEqual(['', '7']);
  });

  it('edit: sends nothing and says so when nothing changed', async () => {
    const { el } = await edit();
    submit(el);
    expect(TestBed.inject(NotificationService).toasts().at(-1)?.message).toBe(
      'تغییری برای ذخیره وجود ندارد.',
    );
  });

  it('edit: sends only changed fields; clearing a field sends an explicit null; moving to root sends parentId null', async () => {
    const { f, el } = await edit(category(5, { parentId: 7, description: 'قدیمی', position: 3 }), [
      category(5, { parentId: 7 }),
      category(7),
    ]);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#description', '');
    fill(el, '#parentId', '', 'change');
    fill(el, '#name', 'نام جدید');
    await f.whenStable();
    submit(el);
    const req = expectApi('PATCH', '/admin/categories/5');
    expect(req.request.body).toEqual({ name: 'نام جدید', description: null, parentId: null });
    req.flush({ data: category(5) });
  });

  it('edit: warns that changing the slug changes the public URL, and sends the new slug', async () => {
    const { f, el } = await edit();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#slug', 'new-slug');
    await f.whenStable();
    expect(el.textContent).toContain('ریدایرکت');
    submit(el);
    const req = expectApi('PATCH', '/admin/categories/5');
    expect(req.request.body).toEqual({ slug: 'new-slug' });
    req.flush({ data: category(5) });
  });

  it('edit: a cleared slug is blocked (required while editing)', async () => {
    const { f, el } = await edit();
    fill(el, '#slug', '');
    submit(el);
    await f.whenStable();
    expect(el.querySelector('#slug-err')!.textContent).toContain('الزامی');
  });

  it('edit: a deleted category is read-only until restored', async () => {
    const { f, el } = await edit(category(5, { deletedAt: '2026-02-01T00:00:00Z' }));
    expect(el.textContent).toContain('حذف شده است');
    expect(el.querySelector<HTMLInputElement>('#name')!.disabled).toBe(true);
    expect(el.querySelector('button[type=submit]')).toBeNull();
    Array.from(el.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent!.includes('بازیابی'))!
      .click();
    expectApi('POST', '/admin/categories/5/restore').flush({ data: category(5) });
    await f.whenStable();
    expect(el.querySelector<HTMLInputElement>('#name')!.disabled).toBe(false);
    expect(el.querySelector('button[type=submit]')).not.toBeNull();
  });

  it('is read-only without categories.write', async () => {
    signIn([Permissions.ProductsRead]);
    const f = TestBed.createComponent(CategoryFormPage);
    await f.whenStable();
    expectApi('GET', '/admin/categories').flush({ data: [] });
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector<HTMLInputElement>('#name')!.disabled).toBe(true);
    expect(el.querySelector('button[type=submit]')).toBeNull();
  });

  it('shows the Persian not-found message', async () => {
    signIn();
    const f = TestBed.createComponent(CategoryFormPage);
    f.componentRef.setInput('id', '404');
    await f.whenStable();
    expectApi('GET', '/admin/categories').flush({ data: [] });
    expectApi('GET', '/admin/categories/404').flush(
      { code: 'category_not_found' },
      { status: 404, statusText: 'x' },
    );
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).textContent).toContain('دسته‌بندی پیدا نشد.');
  });
});
