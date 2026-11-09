import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { LoginPage } from './login.page';

const BASE = 'https://api.tashkino.ir/api/v1';

describe('LoginPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('does not call the API when the form is invalid', async () => {
    const f = TestBed.createComponent(LoginPage);
    await f.whenStable();
    const http = TestBed.inject(HttpTestingController);
    (f.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
    await f.whenStable();
    http.expectNone(`${BASE}/auth/admin/login`);
    expect((f.nativeElement as HTMLElement).textContent).toContain('این فیلد الزامی است.');
  });

  it('shows a generic message on bad credentials and clears the password', async () => {
    const f = TestBed.createComponent(LoginPage);
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    const http = TestBed.inject(HttpTestingController);
    const id = el.querySelector<HTMLInputElement>('#identifier')!;
    const pw = el.querySelector<HTMLInputElement>('#password')!;
    id.value = 'a@b.c';
    id.dispatchEvent(new Event('input'));
    pw.value = 'wrong';
    pw.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    http
      .expectOne(`${BASE}/auth/admin/login`)
      .flush({ title: 'bad' }, { status: 401, statusText: 'Unauthorized' });
    await f.whenStable();
    expect(el.textContent).toContain('اطلاعات ورود صحیح نیست.');
    expect(pw.value).toBe('');
  });

  it('navigates to the dashboard after a successful login (ignoring external returnUrl)', async () => {
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const f = TestBed.createComponent(LoginPage);
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    const http = TestBed.inject(HttpTestingController);
    el.querySelector<HTMLInputElement>('#identifier')!.value = 'a';
    el.querySelector<HTMLInputElement>('#identifier')!.dispatchEvent(new Event('input'));
    el.querySelector<HTMLInputElement>('#password')!.value = 'b';
    el.querySelector<HTMLInputElement>('#password')!.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    http
      .expectOne(`${BASE}/auth/admin/login`)
      .flush({ data: { accessToken: 'T', expiresIn: 900 } });
    http
      .expectOne(`${BASE}/auth/me`)
      .flush({ data: { id: '1', displayName: 'م', roles: [], permissions: [] } });
    expect(nav).toHaveBeenCalledWith('/dashboard');
  });
});
