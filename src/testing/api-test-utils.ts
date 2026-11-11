import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../app/core/auth/auth.store';
import { Permission, Permissions } from '../app/core/authorization/permissions';

export const BASE = 'https://api.tashkino.ir/api/v1';

export function signIn(permissions: Permission[] = Object.values(Permissions), id = 'me'): void {
  TestBed.inject(AuthStore).setSession({ id, displayName: 'مدیر', roles: [], permissions });
}

export function expectApi(method: string, path: string): TestRequest {
  const http = TestBed.inject(HttpTestingController);
  return http.expectOne((r) => r.method === method && r.url.split('?')[0] === `${BASE}${path}`);
}

export function page<T>(data: T[]) {
  return { data, meta: { page: 1, pageSize: 20, totalItems: data.length, totalPages: 1 } };
}
