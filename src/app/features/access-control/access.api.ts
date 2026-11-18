import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { ApiPage } from '../../core/api/api-types';
import {
  PermissionRead,
  RoleCreate,
  RoleRead,
  RoleUpdate,
  UserCreate,
  UserRead,
  UserUpdate,
} from '../../core/api/schemas';
import { UserListQuery } from './access.models';

@Injectable({ providedIn: 'root' })
export class AccessApi {
  private readonly api = inject(ApiClient);

  users(query: UserListQuery): Observable<ApiPage<UserRead>> {
    return this.api.getPage<UserRead>('/admin/users', query);
  }
  user(id: number): Observable<UserRead> {
    return this.api.get<UserRead>(`/admin/users/${id}`);
  }
  createUser(body: UserCreate): Observable<UserRead> {
    return this.api.post<UserRead>('/admin/users', body);
  }
  updateUser(id: number, body: UserUpdate): Observable<UserRead> {
    return this.api.patch<UserRead>(`/admin/users/${id}`, body);
  }

  /** Not paginated. There is no GET by id (open question Q17): forms read from this list. */
  roles(): Observable<RoleRead[]> {
    return this.api.get<RoleRead[]>('/admin/roles');
  }
  createRole(body: RoleCreate): Observable<RoleRead> {
    return this.api.post<RoleRead>('/admin/roles', body);
  }
  updateRole(id: number, body: RoleUpdate): Observable<RoleRead> {
    return this.api.patch<RoleRead>(`/admin/roles/${id}`, body);
  }
  deleteRole(id: number): Observable<void> {
    return this.api.delete(`/admin/roles/${id}`);
  }
  permissions(): Observable<PermissionRead[]> {
    return this.api.get<PermissionRead[]>('/admin/permissions');
  }
}
