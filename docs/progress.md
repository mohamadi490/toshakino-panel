# Progress

## Phase 0 - Foundation: done (local, verified)
- Angular 22 + Tailwind 4 + Vazirmatn, strict TS, runtime config, design tokens, light/dark/system theme, RTL.
- API client (envelope unwrap, problem+json mapping), auth interceptor (single-flight refresh), error interceptor.
- Auth (in-memory token, cookie refresh, restore session, logout), RBAC (typed permissions, guards, `*appCan`, filtered menu), 403/404 pages, admin brand variables.
- Shell (collapsible sidebar, mobile drawer, header, user menu), login page, dashboard placeholder, toasts.
- Tooling: ESLint with architecture boundaries, cycle check, 52 unit tests, CI workflow, Dockerfile + nginx.

## Phase 1 - in progress
Done (local, verified, 107 tests):
- Phase-0 gap closed: global loading indicator (interceptor + bar).
- Shared: data table, pagination, form field + field-error mapping, confirm dialog, `PagedList`, digit normalisation.
- **Access control (item 6)**: users list (search, status filter, paging, enable/disable with confirmation, self-disable hidden), user create/edit (contact rule, Persian-digit mobile, role assignment gated by `roles.assign`, effective permissions view, read-only without `users.update`), roles list, role create/edit (grouped permission matrix, system role name locked).
- **Categories (item 7a)**: tree list (parents first, depth, status badges, product count), create/edit (slug validation, parent choices exclude self+descendants, SEO fields, https-only canonical, backend slug-conflict mapping, read-only without `categories.manage`).
Pending: products (variants, attributes, media), inventory, orders, customers, dashboard, content and brand settings.

## Next: Phase 1 (planned order)
1. Generated API client (blocked on OpenAPI).
2. Categories -> products (variants, media) -> inventory.
3. Orders, customers, content pages, brand settings, dashboard.

## Planned E2E (needs API + browser)
login happy path / bad credentials; session restore on reload; forced refresh on expired token; 403 route; logout from another tab.
