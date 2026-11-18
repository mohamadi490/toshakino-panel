import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { testUser } from '../../../testing/api-test-utils';
import { ApiClient } from '../api/api-client';
import { authInterceptor } from '../api/auth.interceptor';
import { AppConfig } from '../config/app-config';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

const BASE = 'https://api.tashkino.ir/api/v1';
const SESSION = (token: string) => ({
  data: { accessToken: token, tokenType: 'bearer', expiresIn: 900, isNewUser: false },
});
const ME = { data: testUser(['orders.read']) };

describe('AuthService + authInterceptor (contract: /admin/auth/*, /auth/me)', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let store: AuthStore;
  let api: ApiClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', children: [] }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    store = TestBed.inject(AuthStore);
    api = TestBed.inject(ApiClient);
    expect(TestBed.inject(AppConfig).apiBaseUrl).toBe(BASE);
  });

  afterEach(() => http.verify());

  it('admin login posts {identifier,password} with credentials and NO custom headers, keeps the token in memory, then loads /auth/me', () => {
    let done = false;
    auth.login({ identifier: 'admin@tashkino.ir', password: 'x' }).subscribe(() => (done = true));

    const login = http.expectOne(`${BASE}/admin/auth/login`);
    expect(login.request.body).toEqual({ identifier: 'admin@tashkino.ir', password: 'x' });
    expect(login.request.withCredentials).toBe(true);
    expect(login.request.headers.has('Authorization')).toBe(false);
    // CORS only allows Authorization, Content-Type, Idempotency-Key and X-Request-Id.
    expect(
      login.request.headers
        .keys()
        .filter((k) => !['content-type', 'x-request-id'].includes(k.toLowerCase())),
    ).toEqual([]);
    login.flush(SESSION('T1'));

    const me = http.expectOne(`${BASE}/auth/me`);
    expect(me.request.headers.get('Authorization')).toBe('Bearer T1');
    me.flush(ME);

    expect(done).toBe(true);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.can({ all: ['orders.read'] })).toBe(true);
    expect(store.user()?.role.name).toBe('مدیر کل');
  });

  it('does not attach the bearer token to non-API origins', () => {
    store.setToken('T1');
    TestBed.inject(HttpClient).get('https://third-party.example/x').subscribe();
    const req = http.expectOne('https://third-party.example/x');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('on 401 performs ONE shared refresh for concurrent requests and retries each once', () => {
    store.setToken('OLD');
    const results: unknown[] = [];
    api.get('/admin/a').subscribe((r) => results.push(r));
    api.get('/admin/b').subscribe((r) => results.push(r));

    http
      .expectOne(`${BASE}/admin/a`)
      .flush({ code: 'invalid_token' }, { status: 401, statusText: 'Unauthorized' });
    http
      .expectOne(`${BASE}/admin/b`)
      .flush({ code: 'invalid_token' }, { status: 401, statusText: 'Unauthorized' });

    const refresh = http.match(`${BASE}/admin/auth/refresh`);
    expect(refresh.length).toBe(1);
    expect(refresh[0]!.request.withCredentials).toBe(true);
    refresh[0]!.flush(SESSION('NEW'));

    const retryA = http.expectOne(`${BASE}/admin/a`);
    const retryB = http.expectOne(`${BASE}/admin/b`);
    expect(retryA.request.headers.get('Authorization')).toBe('Bearer NEW');
    expect(retryB.request.headers.get('Authorization')).toBe('Bearer NEW');
    retryA.flush({ data: 'a' });
    retryB.flush({ data: 'b' });
    expect(results).toEqual(['a', 'b']);
  });

  it('ends the session when the refresh fails (invalid_refresh_token)', () => {
    store.setToken('OLD');
    store.setSession(testUser([]));
    let failed = false;
    api.get('/admin/a').subscribe({ error: () => (failed = true) });

    http
      .expectOne(`${BASE}/admin/a`)
      .flush({ code: 'invalid_token' }, { status: 401, statusText: 'Unauthorized' });
    http
      .expectOne(`${BASE}/admin/auth/refresh`)
      .flush({ code: 'invalid_refresh_token' }, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.accessToken).toBeNull();
  });

  it('403 permission_denied does not trigger refresh or logout', () => {
    store.setToken('T');
    store.setSession(testUser([]));
    api.get('/admin/a').subscribe({ error: () => undefined });
    http
      .expectOne(`${BASE}/admin/a`)
      .flush({ code: 'permission_denied' }, { status: 403, statusText: 'Forbidden' });
    http.expectNone(`${BASE}/admin/auth/refresh`);
    expect(store.isAuthenticated()).toBe(true);
  });

  it('logout posts to /admin/auth/logout, wipes local state even if the request fails and runs cleanups', () => {
    store.setToken('T');
    store.setSession(testUser([]));
    let cleaned = false;
    auth.registerSessionCleanup(() => (cleaned = true));
    auth.logout().subscribe({ error: () => undefined });
    const req = http.expectOne(`${BASE}/admin/auth/logout`);
    expect(req.request.withCredentials).toBe(true);
    req.flush({}, { status: 500, statusText: 'err' });
    expect(store.accessToken).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
    expect(cleaned).toBe(true);
  });

  it('logout success (204) also clears the session', () => {
    store.setToken('T');
    store.setSession(testUser([]));
    auth.logout().subscribe();
    http
      .expectOne(`${BASE}/admin/auth/logout`)
      .flush(null, { status: 204, statusText: 'No Content' });
    expect(store.isAuthenticated()).toBe(false);
  });

  it('restoreSession refreshes via the cookie then loads the user', () => {
    let restored: boolean | undefined;
    auth.restoreSession().subscribe((r) => (restored = r));
    http.expectOne(`${BASE}/admin/auth/refresh`).flush(SESSION('R1'));
    http.expectOne(`${BASE}/auth/me`).flush(ME);
    expect(restored).toBe(true);
    expect(store.accessToken).toBe('R1');
  });

  it('restoreSession resolves false (anonymous) when there is no valid refresh cookie', () => {
    let restored: boolean | undefined;
    auth.restoreSession().subscribe((r) => (restored = r));
    http
      .expectOne(`${BASE}/admin/auth/refresh`)
      .flush({ code: 'invalid_refresh_token' }, { status: 401, statusText: 'Unauthorized' });
    expect(restored).toBe(false);
    expect(store.status()).toBe('anonymous');
  });
});
