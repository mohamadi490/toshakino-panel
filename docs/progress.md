# Progress

## Phase 0 - Foundation: done (local, verified)
- Angular 22 + Tailwind 4 + Vazirmatn, strict TS, runtime config, design tokens, light/dark/system theme, RTL.
- API client (envelope unwrap, problem+json mapping), auth interceptor (single-flight refresh), error interceptor.
- Auth (in-memory token, cookie refresh, restore session, logout), RBAC (typed permissions, guards, `*appCan`, filtered menu), 403/404 pages, admin brand variables.
- Shell (collapsible sidebar, mobile drawer, header, user menu), login page, dashboard placeholder, toasts.
- Tooling: ESLint with architecture boundaries, cycle check, 52 unit tests, CI workflow, Dockerfile + nginx.

## Next: Phase 1 (planned order)
1. Shared table/form/dialog/pagination/empty-error-loading components + generated API client (blocked on OpenAPI).
2. Admin users, roles and permissions.
3. Categories -> products (variants, media) -> inventory.
4. Orders, customers, content pages, brand settings, audit log.

## Planned E2E (needs API + browser)
login happy path / bad credentials; session restore on reload; forced refresh on expired token; 403 route; logout from another tab.
