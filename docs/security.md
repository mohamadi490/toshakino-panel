# Security notes

## Session
- Access token: **memory only** (`AuthStore`). Never in localStorage/sessionStorage/IndexedDB or URLs. ESLint forbids `localStorage` outside `core/theme` (appearance preference only).
- Refresh token: HttpOnly cookie owned by the backend. The SPA calls `POST /auth/refresh` with `withCredentials` and cannot read it.
- App start: `restoreSession()` tries one refresh; failure means anonymous, never an error page.
- 401: one refresh shared by all concurrent requests (single-flight), each request retried once. Failed refresh ends the session and redirects to `/login?reason=expired`.
- 403: shown as "forbidden", never triggers logout.
- Logout wipes local state even when the network call fails, and runs registered cleanups (brand reset, future personal caches).
- The bearer token is attached only to the configured API origin.
- `returnUrl` after login accepts same-app relative paths only (open-redirect protection).
- Login errors are generic; the UI never reveals whether an account exists.

## Authorization
- Permissions come from `GET /auth/me`; they are defined once in `core/authorization/permissions.ts`.
- Route guards, menu filtering and `*appCan` are **UX only**. Every admin endpoint must enforce its own authorization on the backend.
- Permission changes take effect after a refresh/revalidation of `/auth/me`.

## Content and rendering
- No `innerHTML` / `bypassSecurityTrust*` in the codebase. CMS HTML (later phase) must be sanitised by the backend and rendered through Angular's sanitiser only.
- Brand colours are validated as `#RRGGBB` before reaching CSS variables; logo URLs must be `https://`.
- Logger redacts token/password/authorization/cookie/secret keys.

## Headers
CSP and security headers are set in `deploy/nginx.conf`. `connect-src` must list the API origin (see docs/deployment.md).
