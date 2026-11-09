import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '../api/auth.interceptor';
import { ApiClient } from '../api/api-client';
import { AppConfig } from '../config/app-config';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

const BASE = 'https://api.tashkino.ir/api/v1';
const ME = { data: { id: '1', displayName: 'مدیر', roles: [], permissions: ['orders.read'] } };

describe('AuthService + authInterceptor', () => {
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

  it('login keeps the token in memory, sends credentials, then loads /auth/me', () => {
    let done = false;
    auth.login({ identifier: 'a@b.c', password: 'x' }).subscribe(() => (done = true));

    const login = http.expectOne(`${BASE}/auth/admin/login`);
    expect(login.request.withCredentials).toBe(true);
    expect(login.request.headers.has('Authorization')).toBe(false);
    login.flush({ data: { accessToken: 'T1', expiresIn: 900 } });

    const me = http.expectOne(`${BASE}/auth/me`);
    expect(me.request.headers.get('Authorization')).toBe('Bearer T1');
    me.flush(ME);

    expect(done).toBe(true);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.can({ all: ['orders.read'] })).toBe(true);
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

    http.expectOne(`${BASE}/admin/a`).flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${BASE}/admin/b`).flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = http.match(`${BASE}/auth/refresh`);
    expect(refresh.length).toBe(1);
    expect(refresh[0]!.request.withCredentials).toBe(true);
    refresh[0]!.flush({ data: { accessToken: 'NEW', expiresIn: 900 } });

    const retryA = http.expectOne(`${BASE}/admin/a`);
    const retryB = http.expectOne(`${BASE}/admin/b`);
    expect(retryA.request.headers.get('Authorization')).toBe('Bearer NEW');
    expect(retryB.request.headers.get('Authorization')).toBe('Bearer NEW');
    retryA.flush({ data: 'a' });
    retryB.flush({ data: 'b' });
    expect(results).toEqual(['a', 'b']);
  });

  it('ends the session when the refresh fails', () => {
    store.setToken('OLD');
    store.setSession({ id: '1', displayName: 'م', roles: [], permissions: [] });
    let failed = false;
    api.get('/admin/a').subscribe({ error: () => (failed = true) });

    http.expectOne(`${BASE}/admin/a`).flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${BASE}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.accessToken).toBeNull();
  });

  it('403 does not trigger refresh or logout', () => {
    store.setToken('T');
    store.setSession({ id: '1', displayName: 'م', roles: [], permissions: [] });
    api.get('/admin/a').subscribe({ error: () => undefined });
    http.expectOne(`${BASE}/admin/a`).flush({}, { status: 403, statusText: 'Forbidden' });
    http.expectNone(`${BASE}/auth/refresh`);
    expect(store.isAuthenticated()).toBe(true);
  });

  it('logout wipes local state even if the request fails and runs registered cleanups', () => {
    store.setToken('T');
    store.setSession({ id: '1', displayName: 'م', roles: [], permissions: [] });
    let cleaned = false;
    auth.registerSessionCleanup(() => (cleaned = true));
    auth.logout().subscribe({ error: () => undefined });
    http.expectOne(`${BASE}/auth/logout`).flush({}, { status: 500, statusText: 'err' });
    expect(store.accessToken).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
    expect(cleaned).toBe(true);
  });

  it('restoreSession resolves false (anonymous) when there is no valid refresh cookie', () => {
    let restored: boolean | undefined;
    auth.restoreSession().subscribe((r) => (restored = r));
    http.expectOne(`${BASE}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(restored).toBe(false);
    expect(store.status()).toBe('anonymous');
  });
});
