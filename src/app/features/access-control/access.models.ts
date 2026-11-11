import { AuthRole } from '../../core/auth/auth.models';

/*
 * ASSUMED wire contract (no OpenAPI yet) - see docs/backend-dependencies.md.
 * Remove in favour of generated types once the OpenAPI file exists.
 */
export interface AdminUserSummary {
  id: string;
  displayName: string;
  email?: string | null;
  mobile?: string | null;
  isActive: boolean;
  roles: AuthRole[];
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  /** Union of permissions granted by all assigned roles (server-computed). */
  effectivePermissions: string[];
  updatedAt?: string;
}

export interface CreateUserRequest {
  displayName: string;
  email?: string;
  mobile?: string;
  password: string;
  roleIds: string[];
}

export interface UpdateUserRequest {
  displayName?: string;
  email?: string | null;
  mobile?: string | null;
  isActive?: boolean;
  roleIds?: string[];
}

export interface AdminRole {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions: string[];
  userCount?: number;
}

export interface RoleWriteRequest {
  name: string;
  description?: string | null;
  permissions: string[];
}

export interface PermissionDescriptor {
  key: string;
  group: string;
  label?: string;
  description?: string;
}

export interface UserListQuery {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
  [key: string]: string | number | boolean | undefined;
}
