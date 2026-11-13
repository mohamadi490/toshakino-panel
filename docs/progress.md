# Progress

## Phase 0 - Foundation: done (local, verified)
- Angular 22 + Tailwind 4 + Vazirmatn, strict TS, runtime config, design tokens, light/dark/system theme, RTL.
- API client (envelope unwrap, problem+json mapping), auth interceptor (single-flight refresh), error interceptor.
- Auth (in-memory token, cookie refresh, restore session, logout), RBAC (typed permissions, guards, `*appCan`, filtered menu), 403/404 pages, admin brand variables.
- Shell (collapsible sidebar, mobile drawer, header, user menu), login page, dashboard placeholder, toasts.
- Tooling: ESLint with architecture boundaries, cycle check, 52 unit tests, CI workflow, Dockerfile + nginx.

## Phase 1 - in progress
Done (verified, 158 tests):
- Phase-0 gap closed: global loading indicator (interceptor + bar).
- Shared: data table, pagination, form field + field-error mapping, confirm dialog, `PagedList`, digit normalisation.
- **Access control (item 6)**: users list (search, status filter, paging, enable/disable with confirmation, self-disable hidden), user create/edit (contact rule, Persian-digit mobile, role assignment gated by `roles.assign`, effective permissions view, read-only without `users.update`), roles list, role create/edit (grouped permission matrix, system role name locked).
- **Categories (item 7a)**: tree list (parents first, depth, status badges, product count), create/edit (slug validation, parent choices exclude self+descendants, SEO fields, https-only canonical, backend slug-conflict mapping, read-only without `categories.manage`).
- **Products (item 7b)**: list (search, status + category filters, paging, publish/unpublish with confirmation), create/edit form (slug/category/descriptions, specs, Variant/SKU editor with options, Toman -> Rial conversion, sale < price rule, duplicate-SKU rule, SEO), publish button gated by saved state and a priced active variant, read-only mode without `products.update`.
- Bugs found by tests and fixed: `app-button` ignored an external `[disabled]`; read-only mode left dynamically created controls enabled.
- **Inventory (item 8)**: SKU stock list (search, low/out-of-stock filter, on-hand/reserved/available, status badge, paging), adjustment dialog (increase/decrease, quantity with Persian digits, reason, note required for "other", resulting-stock preview, negative stock refused, duplicate-submit guard, `Idempotency-Key` per payload, backend field errors mapped, row replaced with server figures). Gated by `inventory.read` / `inventory.adjust`.
- **Orders (item 9)**: list (search, order/payment status filters, sort, paging, Toman totals, Jalali time) and detail (purchase-time items and totals, payments, status history, shipping, customer with permission-based masking). Status changes offer only the backend's `allowedTransitions`, cancel needs `orders.cancel` + reason + confirmation, `Idempotency-Key` per payload, conflict -> reload.
- **Customers (item 10)**: list (search, sort, paging, spend in Toman) and profile (info, addresses, paged order history linking to orders; the history needs `orders.read` and is not even requested without it; independent error state).
Pending: media upload (blocked on contract), attribute catalog (blocked on backend model), inventory history (blocked on endpoint), dashboard, content and brand settings.

## Next: Phase 1 (planned order)
1. Generated API client (blocked on OpenAPI).
2. Categories -> products (variants, media) -> inventory.
3. Orders, customers, content pages, brand settings, dashboard.

## Planned E2E (needs API + browser)
login happy path / bad credentials; session restore on reload; forced refresh on expired token; 403 route; logout from another tab.
