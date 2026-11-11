import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { ApiPage } from '../../core/api/api-types';
import {
  AdminRole,
  AdminUserDetail,
  AdminUserSummary,
  CreateUserRequest,
  PermissionDescriptor,
  RoleWriteRequest,
  UpdateUserRequest,
  UserListQuery,
} from './access.models';

@Injectable({ providedIn: 'root' })
export class AccessApi {
  private readonly api = inject(ApiClient);

  users(query: UserListQuery): Observable<ApiPage<AdminUserSummary>> {
    return this.api.getPage<AdminUserSummary>('/admin/users', query);
  }
  user(id: string): Observable<AdminUserDetail> {
    return this.api.get<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`);
  }
  createUser(body: CreateUserRequest): Observable<AdminUserDetail> {
    return this.api.post<AdminUserDetail>('/admin/users', body);
  }
  updateUser(id: string, body: UpdateUserRequest): Observable<AdminUserDetail> {
    return this.api.patch<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`, body);
  }

  /** There is no GET /admin/roles/{id} in the agreed contract, so the role form reads from this list. */
  roles(): Observable<ApiPage<AdminRole>> {
    return this.api.getPage<AdminRole>('/admin/roles', { page: 1, pageSize: 200 });
  }
  createRole(body: RoleWriteRequest): Observable<AdminRole> {
    return this.api.post<AdminRole>('/admin/roles', body);
  }
  updateRole(id: string, body: RoleWriteRequest): Observable<AdminRole> {
    return this.api.patch<AdminRole>(`/admin/roles/${encodeURIComponent(id)}`, body);
  }
  permissions(): Observable<PermissionDescriptor[]> {
    return this.api.get<PermissionDescriptor[]>('/admin/permissions');
  }
}
