import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { testUser } from '../testing/api-test-utils';
import { appConfig } from './app.config';
import { AuthStore } from './core/auth/auth.store';
import { AppConfig } from './core/config/app-config';

const BASE = 'https://api.tashkino.ir/api/v1';

/**
 * Runs the REAL application providers (including the app initializer) the way the browser does.
 * Regression guard: inject() after an `await` in the initializer threw NG0203 and the panel
 * could not boot, which no component test could notice.
 */
describe('application bootstrap (appConfig providers)', () => {
  const initialised = async () => {
    // The initializer waits for /config.json (fetch) and then for the session restore (HTTP).
    await Promise.resolve();
  };

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          apiBaseUrl: 'https://api.tashkino.ir/api/v1',
          environment: 'production',
        }),
      }),
    );
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideLocationMocks(), provideHttpClientTesting()],
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  async function waitForRefreshRequest(http: HttpTestingController) {
    // config.json is fetched first, so the refresh call is issued a few microtasks later.
    for (let i = 0; i < 50; i++) {
      const open = http.match(`${BASE}/admin/auth/refresh`);
      if (open.length) return open[0]!;
      await new Promise((r) => setTimeout(r, 0));
    }
    throw new Error('refresh request was never sent: the app initializer did not reach it');
  }

  it('boots without an injection error and ends anonymous when there is no refresh cookie', async () => {
    const status = TestBed.inject(ApplicationInitStatus);
    const http = TestBed.inject(HttpTestingController);
    const req = await waitForRefreshRequest(http);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ code: 'invalid_refresh_token' }, { status: 401, statusText: 'Unauthorized' });
    await initialised();
    await status.donePromise;
    expect(TestBed.inject(AuthStore).status()).toBe('anonymous');
    expect(TestBed.inject(AppConfig).apiBaseUrl).toBe(BASE);
  });

  it('restores the session on boot when the refresh cookie is valid', async () => {
    const status = TestBed.inject(ApplicationInitStatus);
    const http = TestBed.inject(HttpTestingController);
    const req = await waitForRefreshRequest(http);
    req.flush({
      data: { accessToken: 'T', tokenType: 'bearer', expiresIn: 900, isNewUser: false },
    });
    await new Promise((r) => setTimeout(r, 0));
    http.expectOne(`${BASE}/auth/me`).flush({ data: testUser(['orders.read']) });
    await status.donePromise;
    const store = TestBed.inject(AuthStore);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.can({ all: ['orders.read'] })).toBe(true);
  });

  it('still boots when /config.json cannot be fetched (falls back to the default API)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideLocationMocks(), provideHttpClientTesting()],
    });
    const status = TestBed.inject(ApplicationInitStatus);
    const http = TestBed.inject(HttpTestingController);
    const req = await waitForRefreshRequest(http);
    req.flush({ code: 'invalid_refresh_token' }, { status: 401, statusText: 'x' });
    await status.donePromise;
    expect(TestBed.inject(AppConfig).apiBaseUrl).toBe(BASE);
  });
});
