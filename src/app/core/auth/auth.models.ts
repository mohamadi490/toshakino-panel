import { AdminLogin, UserRead } from '../api/schemas';

/** `POST /admin/auth/login` body. */
export type LoginRequest = AdminLogin;

/** `GET /auth/me` response: one role plus the effective permission codes. */
export type CurrentUser = UserRead;

/** Best human label for a user: full name, then username, email, mobile, finally the id. */
export function userDisplayName(
  user: Pick<UserRead, 'id' | 'fullName' | 'username' | 'email' | 'mobile'>,
): string {
  return user.fullName || user.username || user.email || user.mobile || `#${user.id}`;
}
