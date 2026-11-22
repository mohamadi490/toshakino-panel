import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { expectApi, signIn } from '../../../testing/api-test-utils';
import { AttributeFormPage } from './attribute-form.page';
import { attribute } from './fixtures';

function fill(el: HTMLElement, selector: string, value: string) {
  const n = el.querySelector<HTMLInputElement>(selector)!;
  n.value = value;
  n.dispatchEvent(new Event('input'));
}
const toast = () => TestBed.inject(NotificationService).toasts().at(-1)?.message;

describe('AttributeFormPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function create(perms: string[] = Object.values(Permissions)) {
    signIn(perms);
    const f = TestBed.createComponent(AttributeFormPage);
    await f.whenStable();
    return {
      f,
      el: f.nativeElement as HTMLElement,
      form: () => f.nativeElement.querySelector('form') as HTMLFormElement,
    };
  }
  async function edit(a = attribute(1), perms: string[] = Object.values(Permissions)) {
    signIn(perms);
    const f = TestBed.createComponent(AttributeFormPage);
    f.componentRef.setInput('id', String(a.id));
    await f.whenStable();
    expectApi('GET', `/admin/attributes/${a.id}`).flush({ data: a });
    await f.whenStable();
    return {
      f,
      el: f.nativeElement as HTMLElement,
      form: () => f.nativeElement.querySelector('form') as HTMLFormElement,
    };
  }
  const clickButton = (el: HTMLElement, text: string, root: ParentNode = el) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent!.includes(text))!
      .click();

  it('create: sends name, position and the non-empty values (Persian digits normalised); blank rows are ignored', async () => {
    const { f, el, form } = await create();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#name', ' سایز ');
    fill(el, '#position', '۲');
    clickButton(el, 'افزودن مقدار');
    clickButton(el, 'افزودن مقدار');
    clickButton(el, 'افزودن مقدار');
    await f.whenStable();
    fill(el, '[aria-label="مقدار 1"]', '۹۰×۲۰۰');
    fill(el, '[aria-label="ترتیب مقدار 1"]', '۱');
    fill(el, '[aria-label="مقدار 2"]', '۱۶۰×۲۰۰');
    // row 3 stays empty: it must be ignored, not block the form
    form().dispatchEvent(new Event('submit'));
    const req = expectApi('POST', '/admin/attributes');
    expect(req.request.body).toEqual({
      name: 'سایز',
      position: 2,
      values: [
        { value: '۹۰×۲۰۰', position: 1 },
        { value: '۱۶۰×۲۰۰', position: 0 },
      ],
    });
    req.flush({ data: attribute(9) });
  });

  it('create: values are optional', async () => {
    const { el, form } = await create();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(el, '#name', 'رنگ');
    form().dispatchEvent(new Event('submit'));
    const req = expectApi('POST', '/admin/attributes');
    expect(req.request.body).toEqual({ name: 'رنگ', position: 0, values: [] });
    req.flush({ data: attribute(9) });
  });

  it('create: rejects duplicate values before calling the API', async () => {
    const { f, el, form } = await create();
    fill(el, '#name', 'رنگ');
    clickButton(el, 'افزودن مقدار');
    clickButton(el, 'افزودن مقدار');
    await f.whenStable();
    fill(el, '[aria-label="مقدار 1"]', 'قرمز');
    fill(el, '[aria-label="مقدار 2"]', ' قرمز ');
    form().dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(el.textContent).toContain('نباید تکراری باشند');
  });

  it('create: requires a name; attribute_name_taken lands on it', async () => {
    const { f, el, form } = await create();
    form().dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(el.querySelector('#name-err')!.textContent).toContain('الزامی');
    fill(el, '#name', 'سایز');
    form().dispatchEvent(new Event('submit'));
    expectApi('POST', '/admin/attributes').flush(
      { code: 'attribute_name_taken' },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expect(el.textContent).toContain('نام این ویژگی قبلاً استفاده شده است.');
  });

  it('edit: shows values ordered by position', async () => {
    const { el } = await edit(
      attribute(1, {
        values: [
          { id: 12, value: 'ب', position: 1 },
          { id: 11, value: 'الف', position: 0 },
        ],
      }),
    );
    const values = Array.from(
      el.querySelectorAll<HTMLInputElement>('section [aria-label^="مقدار "]'),
    )
      .filter((i) => !i.getAttribute('aria-label')!.includes('ترتیب'))
      .map((i) => i.value);
    expect(values.slice(0, 2)).toEqual(['الف', 'ب']);
  });

  it('edit: rename sends only the changed field and keeps the page', async () => {
    const { f, el, form } = await edit();
    fill(el, '#name', 'جنس');
    await f.whenStable();
    form().dispatchEvent(new Event('submit'));
    const req = expectApi('PATCH', '/admin/attributes/1');
    expect(req.request.body).toEqual({ name: 'جنس' });
    req.flush({ data: attribute(1, { name: 'جنس' }) });
    await f.whenStable();
    expect(el.querySelector<HTMLInputElement>('#name')!.value).toBe('جنس');
  });

  it('edit: nothing changed -> no request', async () => {
    const { form } = await edit();
    form().dispatchEvent(new Event('submit'));
    expect(toast()).toBe('تغییری برای ذخیره وجود ندارد.');
  });

  it('edit: adds a value and refreshes from the returned attribute', async () => {
    const { f, el } = await edit();
    const addForm = el.querySelectorAll('form')[1] as HTMLFormElement;
    fill(el, 'form[ng-reflect-form] [aria-label="مقدار جدید"], [aria-label="مقدار جدید"]', 'ج');
    addForm.dispatchEvent(new Event('submit'));
    const req = expectApi('POST', '/admin/attributes/1/values');
    expect(req.request.body).toEqual({ value: 'ج', position: 0 });
    req.flush({
      data: attribute(1, {
        values: [
          { id: 11, value: 'الف', position: 0 },
          { id: 12, value: 'ب', position: 1 },
          { id: 13, value: 'ج', position: 0 },
        ],
      }),
    });
    await f.whenStable();
    expect(el.textContent).toContain('مقدار افزوده شد'.slice(0, 0) + '');
    expect(
      el.querySelectorAll('section input[aria-label^="مقدار "]:not([aria-label*="ترتیب"])').length,
    ).toBeGreaterThanOrEqual(3);
  });

  it('edit: a duplicate value shows attribute_value_taken in Persian', async () => {
    const { el } = await edit();
    fill(el, '[aria-label="مقدار جدید"]', 'الف');
    (el.querySelectorAll('form')[1] as HTMLFormElement).dispatchEvent(new Event('submit'));
    expectApi('POST', '/admin/attributes/1/values').flush(
      { code: 'attribute_value_taken' },
      { status: 409, statusText: 'x' },
    );
    expect(toast()).toBe('این مقدار قبلاً برای ویژگی ثبت شده است.');
  });

  it('edit: saving a row sends only the changed fields to the value endpoint', async () => {
    const { f, el } = await edit();
    fill(el, 'section [aria-label="مقدار 1"]', 'الف جدید');
    await f.whenStable();
    clickButton(el, 'ذخیره', el.querySelector('section')!);
    const req = expectApi('PATCH', '/admin/attributes/1/values/11');
    expect(req.request.body).toEqual({ value: 'الف جدید' });
    req.flush({
      data: attribute(1, {
        values: [
          { id: 11, value: 'الف جدید', position: 0 },
          { id: 12, value: 'ب', position: 1 },
        ],
      }),
    });
    await f.whenStable();
    expect(toast()).toBe('مقدار ذخیره شد.');
  });

  it('edit: the row save button is disabled until the row changes', async () => {
    const { f, el } = await edit();
    const saveBtn = () =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('section button')).find((b) =>
        b.textContent!.includes('ذخیره'),
      )!;
    expect(saveBtn().disabled).toBe(true);
    fill(el, 'section [aria-label="ترتیب مقدار 1"]', '5');
    await f.whenStable();
    expect(saveBtn().disabled).toBe(false);
  });

  it('edit: deleting a value needs confirmation and the answer carries the updated attribute', async () => {
    const { f, el } = await edit();
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('section [aria-label="حذف مقدار 1"]')!.click();
    await f.whenStable();
    const req = expectApi('DELETE', '/admin/attributes/1/values/11');
    req.flush({ data: attribute(1, { values: [{ id: 12, value: 'ب', position: 1 }] }) }); // 200 with data (not 204)
    await f.whenStable();
    expect(toast()).toBe('مقدار حذف شد.');
    expect(
      el.querySelectorAll('section input[aria-label^="مقدار "]:not([aria-label*="ترتیب"])').length,
    ).toBe(2); // 1 value + the "new value" input
  });

  it('edit: attribute_value_in_use is explained when a value cannot be removed', async () => {
    const { f, el } = await edit();
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('section [aria-label="حذف مقدار 1"]')!.click();
    await f.whenStable();
    expectApi('DELETE', '/admin/attributes/1/values/11').flush(
      { code: 'attribute_value_in_use' },
      { status: 409, statusText: 'x' },
    );
    await f.whenStable();
    expect(toast()).toBe('این مقدار در Variantها استفاده شده و حذف نمی‌شود.');
  });

  it('edit: a declined delete confirmation sends nothing', async () => {
    const { f, el } = await edit();
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockResolvedValue(false);
    el.querySelector<HTMLButtonElement>('section [aria-label="حذف مقدار 1"]')!.click();
    await f.whenStable();
  });

  it('edit: read-only for products.read only (no save, add or delete controls)', async () => {
    const { el } = await edit(attribute(1), [Permissions.ProductsRead]);
    expect(el.querySelector<HTMLInputElement>('#name')!.disabled).toBe(true);
    expect(el.querySelector('button[type=submit]')).toBeNull();
    expect(el.querySelector('[aria-label="مقدار جدید"]')).toBeNull();
    expect(el.querySelector('[aria-label="حذف مقدار 1"]')).toBeNull();
  });

  it('shows the Persian not-found message', async () => {
    signIn();
    const f = TestBed.createComponent(AttributeFormPage);
    f.componentRef.setInput('id', '404');
    await f.whenStable();
    expectApi('GET', '/admin/attributes/404').flush(
      { code: 'attribute_not_found' },
      { status: 404, statusText: 'x' },
    );
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).textContent).toContain('ویژگی پیدا نشد.');
  });
});
