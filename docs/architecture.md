# Architecture

```
src/app/
  core/        singletons: config, API client + interceptors, auth, authorization, brand, theme, navigation, logging, error handling
  shared/      generic, app-agnostic UI/pipes/utilities (money, Jalali dates, button, icon)
  layouts/     auth layout, admin shell, chrome (toasts, appearance toggle)
  features/    one folder per business area (auth, dashboard, errors; products/orders/... in later phases)
```

## Import rules (enforced by ESLint `no-restricted-imports`)

| From | May import | Must not import |
|---|---|---|
| `shared` | itself only | core, layouts, features |
| `core` | shared, itself | layouts, features |
| `layouts` | core, shared | features |
| `features/X` | core, shared, itself | other features, layouts |

`npm run check:cycles` fails the build on circular static imports. Feature routes are lazy-loaded from `app.routes.ts`.

## Conventions
- Standalone components, signals, `OnPush`, zoneless change detection (Angular 22 default).
- Reactive forms; strict TypeScript and strict templates.
- Component selector prefix `app-`; files named `x.page.ts`, `x.service.ts`, `x.store.ts`.
- Logical CSS properties only (`ms-`, `ps-`, `start-`, `end-`) so RTL is the default, not a patch.
- Money is **integer Rial** on the wire (`priceRial`, `totalRial`...). UI shows Toman (÷10) by default via the `money` pipe.
- Dates are ISO-8601 UTC on the wire; UI shows Jalali in Asia/Tehran via the `jdate` pipe.

## Adding a feature (checklist)
1. `features/<name>/` with lazy `loadChildren` route.
2. Every route has `canActivate: [permissionGuard]` and `data: { permissions: { all: [Permissions.X] } }`. A route without a policy is denied and redirects to `/forbidden`. (Do not use `canMatch` for this: a failed match falls through to the 404 wildcard instead of showing 403.)
3. Add a `NAV_ITEMS` entry with the same permission.
4. Gate actions with `*appCan`.
5. Tests for loading, empty, error, forbidden and happy paths.
