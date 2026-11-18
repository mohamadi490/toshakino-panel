import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { requestIdInterceptor } from './request-id.interceptor';

const API = 'https://api.tashkino.ir/api/v1';

describe('requestIdInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([requestIdInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });
  afterEach(() => http.verify());

  it('sends a contract-valid X-Request-Id (8-64 of A-Za-z0-9._-) to the API, unique per request', () => {
    client.get(`${API}/admin/orders`).subscribe();
    client.get(`${API}/admin/orders`).subscribe();
    const ids = http.match(`${API}/admin/orders`).map((r) => r.request.headers.get('X-Request-Id'));
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9._-]{8,64}$/);
    expect(new Set(ids).size).toBe(2);
  });

  it('does not leak it to other origins and keeps an explicit one', () => {
    client.get('https://third-party.example/x').subscribe();
    expect(
      http.expectOne('https://third-party.example/x').request.headers.has('X-Request-Id'),
    ).toBe(false);
    client.get(`${API}/x`, { headers: { 'X-Request-Id': 'fixed-id-12345' } }).subscribe();
    expect(http.expectOne(`${API}/x`).request.headers.get('X-Request-Id')).toBe('fixed-id-12345');
  });
});
