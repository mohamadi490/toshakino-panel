# Testing

`npm test` (Angular 22 default runner: Vitest + jsdom). `npm run verify` is the pre-push gate.

Covered in Phase 0: permission evaluator, auth store (incl. "token never in web storage"), login/refresh single-flight/retry/failed-refresh/403/logout/restore-session, guards (authGuard, guestGuard, permissionGuard incl. missing policy), API error mapping, runtime-config validation, logger redaction, theme service, brand validation, money (Rial/Toman) and Jalali formatting, navigation filtering, login page behaviour.

Not covered here: **E2E** (needs a running API and a browser; Playwright browsers cannot be downloaded in the authoring sandbox). Planned scenarios live in docs/progress.md.

Phase 1 additions: PagedList (incl. stale-response cancellation), data table states, pagination, loading counter, field-error mapping, digit normalisation, users list (paging params, error+retry, permission-gated actions, confirm-before-disable), user form (contact rule, normalised payload, duplicate-submit guard, backend field errors, read-only mode, no `roleIds` without `roles.assign`), role form (sorted permission payload, system role lock, not-found).

Catalog additions: category tree ordering/cycle safety, slug validator, category list/form (parent choices exclude descendants, backend slug conflict), Toman parsing, product list (filters, confirm-before-publish) and form (Toman->Rial payload, sale/duplicate-SKU/price rules, variant id kept on update, publish gating, read-only mode), button disabled/loading merge.

Inventory additions: list rendering/flags/filters/permissions/error+retry, adjust dialog (signed delta, Persian digits, negative-stock refusal, quantity validation table, note-required rule, Idempotency-Key reuse on retry and rotation on change, duplicate-submit guard, backend field-error mapping, emitted result), idempotency key utility.
Orders additions: label/tone mapping with raw fallback, list (sort/status/payment params, unknown status, error+retry), detail (items/totals/history, server-allowed transitions only, cancel permission, read-only, no-transition message, customer masking, status change with Idempotency-Key, cancel note+confirm, key reuse/rotation, 409 reload, load error).
Customers additions: list (paging/sort params, contact fallbacks, error+retry), profile (history filtered by customerId, no orders request without orders.read, empty addresses/null spend, inactive flag, load error+retry, independent history error).
