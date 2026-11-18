import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserRead } from '../app/core/api/schemas';
import { AuthStore } from '../app/core/auth/auth.store';
import { Permissions } from '../app/core/authorization/permissions';

export const BASE = 'https://api.tashkino.ir/api/v1';

/** A contract-shaped admin user (one role, string permission codes). */
export function testUser(
  permissions: readonly string[] = Object.values(Permissions),
  id = 1,
): UserRead {
  return {
    id,
    email: 'admin@tashkino.ir',
    username: 'admin',
    mobile: null,
    fullName: 'مدیر',
    role: { id: 1, name: 'مدیر کل', isStaff: true },
    permissions: [...permissions],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

export function signIn(permissions: readonly string[] = Object.values(Permissions), id = 1): void {
  TestBed.inject(AuthStore).setSession(testUser(permissions, id));
}

export function expectApi(method: string, path: string): TestRequest {
  const http = TestBed.inject(HttpTestingController);
  return http.expectOne((r) => r.method === method && r.url.split('?')[0] === `${BASE}${path}`);
}

export function page<T>(data: T[]) {
  return { data, pagination: { page: 1, pageSize: 20, totalItems: data.length, totalPages: 1 } };
}
