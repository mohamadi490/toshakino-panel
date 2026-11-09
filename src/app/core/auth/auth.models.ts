import { Permission } from '../authorization/permissions';

export interface LoginRequest {
  identifier: string;
  password: string;
}

/** POST /auth/admin/login and POST /auth/refresh response `data` (assumed contract - see docs/backend-dependencies.md). */
export interface TokenResponse {
  accessToken: string;
  tokenType?: 'Bearer';
  /** seconds until the access token expires */
  expiresIn: number;
}

export interface AuthRole {
  id: string;
  name: string;
  isSystem?: boolean;
}

/** GET /auth/me response `data`. */
export interface CurrentUser {
  id: string;
  displayName: string;
  email?: string | null;
  mobile?: string | null;
  roles: AuthRole[];
  permissions: Permission[];
}
