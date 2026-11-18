/** Legacy shape; replaced by the contract's RoleBrief in B1. */
export interface AuthRole {
  id: string;
  name: string;
  isSystem?: boolean;
}

/*
 * LEGACY pre-OpenAPI model: being replaced per docs/roadmap.md (contract: docs/contracts/openapi.json).
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
