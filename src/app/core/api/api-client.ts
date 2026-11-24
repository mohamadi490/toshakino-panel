import { HttpClient, HttpEventType, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map } from 'rxjs';
import { AppConfig } from '../config/app-config';
import { ApiEnvelope, ApiPage, ListQuery } from './api-types';

/** Thin typed wrapper over HttpClient: resolves base URL and unwraps the {data, meta} envelope. */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfig);

  get<T>(path: string, params?: ListQuery): Observable<T> {
    return this.http
      .get<ApiEnvelope<T>>(this.url(path), { params: toParams(params) })
      .pipe(map((r) => r.data));
  }

  getPage<T>(path: string, params?: ListQuery): Observable<ApiPage<T>> {
    return this.http.get<ApiPage<T>>(this.url(path), { params: toParams(params) });
  }

  post<T>(path: string, body?: unknown, headers?: Record<string, string>): Observable<T> {
    return this.http
      .post<ApiEnvelope<T>>(this.url(path), body ?? {}, { headers })
      .pipe(map((r) => r.data));
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<ApiEnvelope<T>>(this.url(path), body).pipe(map((r) => r.data));
  }

  patchWithHeaders<T>(path: string, body: unknown, headers: Record<string, string>): Observable<T> {
    return this.http
      .patch<ApiEnvelope<T>>(this.url(path), body, { headers })
      .pipe(map((r) => r.data));
  }

  /**
   * multipart/form-data upload with progress. Never set Content-Type by hand: the browser must add
   * the multipart boundary. Emits `{progress}` events and finally `{progress: 100, data}`.
   */
  postForm<T>(path: string, form: FormData): Observable<{ progress: number; data?: T }> {
    return this.http.post<ApiEnvelope<T>>(this.url(path), form, { reportProgress: true, observe: 'events' }).pipe(
      map((ev): { progress: number; data?: T } | null => {
        if (ev.type === HttpEventType.UploadProgress) return { progress: ev.total ? Math.round((ev.loaded / ev.total) * 100) : 0 };
        if (ev.type === HttpEventType.Response) return ev.body ? { progress: 100, data: ev.body.data } : { progress: 100 };
        return null;
      }),
      filter((x): x is { progress: number; data?: T } => x !== null),
    );
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiEnvelope<T>>(this.url(path), body).pipe(map((r) => r.data));
  }

  /** DELETE that answers `{data}` (e.g. attribute value deletion returns the updated attribute). */
  deleteWithBody<T>(path: string): Observable<T> {
    return this.http.delete<ApiEnvelope<T>>(this.url(path)).pipe(map((r) => r.data));
  }

  delete(path: string): Observable<void> {
    return this.http.delete<void>(this.url(path));
  }

  url(path: string): string {
    return `${this.config.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }
}

export function toParams(query?: ListQuery): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') params = params.set(key, String(value));
  }
  return params;
}
