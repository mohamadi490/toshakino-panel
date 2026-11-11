import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { loadingInterceptor } from '../api/loading.interceptor';
import { LoadingService } from './loading.service';

describe('loading', () => {
  it('is active while requests are in flight, including concurrent ones', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([loadingInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const loading = TestBed.inject(LoadingService);
    const http = TestBed.inject(HttpTestingController);
    const client = TestBed.inject(HttpClient);
    client.get('/a').subscribe();
    client.get('/b').subscribe({ error: () => undefined });
    expect(loading.active()).toBe(true);
    http.expectOne('/a').flush({});
    expect(loading.active()).toBe(true);
    http.expectOne('/b').flush({}, { status: 500, statusText: 'x' });
    expect(loading.active()).toBe(false);
  });
});
