import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { expectApi, signIn } from '../../../testing/api-test-utils';
import { BrandFormPage } from './brand-form.page';
import { brand } from './fixtures';

function fill(el: HTMLElement, selector: string, value: string) {
  const n = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  n.value = value;
  n.dispatchEvent(new Event('input'));
}
const submit = (el: HTMLElement) => el.querySelector('form')!.dispatchEvent(new Event('submit'));

describe('BrandFormPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function create() {
    signIn();
    const f = TestBed.createComponent(BrandFormPage);
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement };
  }
  async function edit(
    b = brand(4, { description: 'قدیمی' }),
    perms: string[] = Object.values(Permissions),
  ) {
    signIn(perms);
    const f = TestBed.createComponent(BrandFormPage);
    f.componentRef.setInput('id', String(b.id));
    await f.whenStable();
    expectApi('GET', `/admin/brands/${b.id}`).flush({ data: b });
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement };
  }

  it('create: sends the name only when nothing else is filled (slug derived by the server)', async () => {
    const { f, el } = await create();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#name', ' ایرانی ');
    submit(el);
    const req = expectApi('POST', '/admin/brands');
    expect(req.request.body).toEqual({ name: 'ایرانی' });
    req.flush({ data: brand(9) });
    await f.whenStable();
  });

  it('create: sends the optional fields that were filled', async () => {
    const { el } = await create();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#name', 'x');
    fill(el, '#logoUrl', 'https://cdn.x.ir/l.png');
    fill(el, '#logoAlt', 'لوگو');
    fill(el, '#seoTitle', 'عنوان');
    submit(el);
    const req = expectApi('POST', '/admin/brands');
    expect(req.request.body).toEqual({
      name: 'x',
      logoUrl: 'https://cdn.x.ir/l.png',
      logoAlt: 'لوگو',
      seoTitle: 'عنوان',
    });
    req.flush({ data: brand(9) });
  });

  it('create: validates name and logo URL', async () => {
    const { f, el } = await create();
    fill(el, '#logoUrl', 'javascript:alert(1)');
    submit(el);
    await f.whenStable();
    expect(el.querySelector('#name-err')!.textContent).toContain('الزامی');
    expect(el.querySelector('#logoUrl-err')!.textContent).toContain('http');
  });

  it('create: brand_name_taken lands on the name field', async () => {
    const { f, el } = await create();
    fill(el, '#name', 'تکراری');
    submit(el);
    expectApi('POST', '/admin/brands').flush(
      { code: 'brand_name_taken' },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expect(el.querySelector('#name-err')!.textContent).toContain(
      'نام این برند قبلاً استفاده شده است.',
    );
  });

  it('create: slug_taken lands on the slug field', async () => {
    const { f, el } = await create();
    fill(el, '#name', 'x');
    fill(el, '#slug', 's');
    submit(el);
    expectApi('POST', '/admin/brands').flush(
      { code: 'slug_taken' },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expect(el.querySelector('#slug-err')!.textContent).toContain(
      'این اسلاگ قبلاً استفاده شده است.',
    );
  });

  it('edit: sends only changed fields with explicit null to clear', async () => {
    const { f, el } = await edit();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#description', '');
    fill(el, '#name', 'نام جدید');
    await f.whenStable();
    submit(el);
    const req = expectApi('PATCH', '/admin/brands/4');
    expect(req.request.body).toEqual({ name: 'نام جدید', description: null });
    req.flush({ data: brand(4) });
  });

  it('edit: says nothing changed and sends no request', async () => {
    const { el } = await edit();
    submit(el);
    expect(TestBed.inject(NotificationService).toasts().at(-1)?.message).toBe(
      'تغییری برای ذخیره وجود ندارد.',
    );
  });

  it('edit: warns about the slug change', async () => {
    const { f, el } = await edit();
    fill(el, '#slug', 'new');
    await f.whenStable();
    expect(el.textContent).toContain('ریدایرکت');
  });

  it('edit: a deleted brand is read-only until restored', async () => {
    const { f, el } = await edit(brand(4, { deletedAt: '2026-02-01T00:00:00Z' }));
    expect(el.querySelector<HTMLInputElement>('#name')!.disabled).toBe(true);
    Array.from(el.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent!.includes('بازیابی'))!
      .click();
    expectApi('POST', '/admin/brands/4/restore').flush({ data: brand(4) });
    await f.whenStable();
    expect(el.querySelector<HTMLInputElement>('#name')!.disabled).toBe(false);
  });

  it('is read-only without categories.write', async () => {
    const { el } = await edit(brand(4), [Permissions.ProductsRead]);
    expect(el.querySelector<HTMLInputElement>('#name')!.disabled).toBe(true);
    expect(el.querySelector('button[type=submit]')).toBeNull();
  });

  it('shows the Persian not-found message', async () => {
    signIn();
    const f = TestBed.createComponent(BrandFormPage);
    f.componentRef.setInput('id', '404');
    await f.whenStable();
    expectApi('GET', '/admin/brands/404').flush(
      { code: 'brand_not_found' },
      { status: 404, statusText: 'x' },
    );
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).textContent).toContain('برند پیدا نشد.');
  });
});
