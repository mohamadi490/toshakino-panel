# Backend dependencies, assumptions and open questions

No OpenAPI file exists yet, so Phase 0 code follows `BACKEND-REQUIREMENTS.md` and the assumptions below. **Each item marked ASSUMED must be confirmed or replaced by the real OpenAPI.** When OpenAPI is available we generate typed clients and delete the hand-written types in `core/auth/auth.models.ts`.

## From the requirements doc (used as-is)
- Base path `/api/v1`; success envelope `{ data, meta }`; lists `{ data[], meta{page,pageSize,totalItems,totalPages} }`; errors `application/problem+json` with `code`, `fieldErrors`, `traceId`; camelCase; money integer Rial.
- Admin login `POST /auth/admin/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- Brand: `GET/PUT /admin/brand/admin` (permissions `brand.admin.read/update`).

## ASSUMED (not specified in the requirements)
| # | Assumption | Where used |
|---|---|---|
| 1 | Login body `{ identifier, password }` (email or mobile) | `LoginRequest` |
| 2 | Login/refresh `data` = `{ accessToken, tokenType?, expiresIn }`; refresh cookie is set by the server | `TokenResponse` |
| 3 | `/auth/me` `data` = `{ id, displayName, email?, mobile?, roles[{id,name,isSystem?}], permissions[] }` | `CurrentUser` |
| 4 | Cookie endpoints (login, refresh, logout) accept the header `X-Requested-With: toshakino-admin` and the backend also verifies `Origin` for CSRF | `AuthService` |
| 5 | Admin brand `data` = `{ version, primaryColor, secondaryColor, primaryColorDark?, secondaryColorDark?, logoUrl? }` (HEX) | `BrandService` |
| 6 | Logout returns 204/200 with empty body | `AuthService.logout` |

## ASSUMED - users and roles (Phase 1, access-control)
| # | Assumption | Where used |
|---|---|---|
| 7 | `GET /admin/users` accepts `page`, `pageSize`, `search`, `isActive` and returns `{id, displayName, email?, mobile?, isActive, roles[], lastLoginAt?, createdAt}` | `AdminUserSummary`, users list |
| 8 | `GET /admin/users/{id}` adds `effectivePermissions: string[]` (server-computed union over roles) | user form |
| 9 | `POST /admin/users` body `{displayName, email?, mobile?, password, roleIds[]}`; mobile format `09XXXXXXXXX`; password min length 10 is a UI guess | user form |
| 10 | `PATCH /admin/users/{id}` accepts partial `{displayName, email, mobile, isActive, roleIds}`; disabling = `isActive:false` (permission `users.disable`); `roleIds` needs `roles.assign` and is omitted from the body when the admin lacks it | list + form |
| 11 | There is no `GET /admin/roles/{id}`; `GET /admin/roles` returns roles WITH their `permissions[]` (and ideally `userCount`) | role form reads the list |
| 12 | `GET /admin/permissions` returns `[{key, group, label?, description?}]` | role matrix |
| 13 | Validation errors use `fieldErrors` keyed by the same camelCase field names as the request body | `applyFieldErrors` |

## ASSUMED - categories (Phase 1, catalog)
| # | Assumption | Where used |
|---|---|---|
| 14 | `GET /admin/categories` returns a flat list `{id, parentId\|null, slug, title, description?, status, sortOrder, seoTitle?, seoDescription?, canonicalUrl?, productCount?}`; the UI builds the tree and requests `pageSize=500` (ask: a non-paginated or `?tree=true` form) | list + form |
| 15 | Publish status values are `draft`, `published`, `archived` (same for products/pages) | `PublishStatus` |
| 16 | No `GET /admin/categories/{id}` and no DELETE in the contract: forms read from the list; removal = `status: archived` | category form |
| 17 | `POST/PATCH` take the full field set above; slug conflicts return 409 with `fieldErrors.slug`; slug change creates the redirect server-side | category form |

Backend must also enforce (UI does not): category cycles (a parent cannot be a descendant), slug uniqueness, redirect-chain avoidance, archiving a category that still has published products.

Backend must also enforce (UI does not): users cannot disable themselves or remove the last super-admin; system roles cannot be renamed/deleted; assigning roles/permissions the caller does not hold (privilege escalation) is rejected.

## Questions for the backend team
1. Final login identifier: email, mobile or both? Any 2FA/OTP for admins?
2. Exact CSRF mechanism for the refresh cookie (header, double-submit, Origin check only)?
3. Access-token lifetime and whether permissions are re-evaluated on every request (stale-permission policy).
4. List query contract names: `page`, `pageSize`, `sort` format, filter param naming.
5. Idempotency header name for create/mutate calls (needed from Phase 1 orders/inventory).
6. Upload contract for media (multipart vs presigned URL).
7. OpenAPI URL (or file) reachable by CI for client generation and contract diff.
8. Should `PATCH /admin/users` use optimistic concurrency (`version`/`ETag`) to avoid lost updates?
9. Open product decisions from the requirements doc §12 that affect admin forms (variants attributes, order status transitions, stock display policy).
