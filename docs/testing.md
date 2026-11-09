# Testing

`npm test` (Angular 22 default runner: Vitest + jsdom). `npm run verify` is the pre-push gate.

Covered in Phase 0: permission evaluator, auth store (incl. "token never in web storage"), login/refresh single-flight/retry/failed-refresh/403/logout/restore-session, guards (authGuard, guestGuard, permissionGuard incl. missing policy), API error mapping, runtime-config validation, logger redaction, theme service, brand validation, money (Rial/Toman) and Jalali formatting, navigation filtering, login page behaviour.

Not covered here: **E2E** (needs a running API and a browser; Playwright browsers cannot be downloaded in the authoring sandbox). Planned scenarios live in docs/progress.md.
