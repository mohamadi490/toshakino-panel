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

## Questions for the backend team
1. Final login identifier: email, mobile or both? Any 2FA/OTP for admins?
2. Exact CSRF mechanism for the refresh cookie (header, double-submit, Origin check only)?
3. Access-token lifetime and whether permissions are re-evaluated on every request (stale-permission policy).
4. List query contract names: `page`, `pageSize`, `sort` format, filter param naming.
5. Idempotency header name for create/mutate calls (needed from Phase 1 orders/inventory).
6. Upload contract for media (multipart vs presigned URL).
7. OpenAPI URL (or file) reachable by CI for client generation and contract diff.
8. Open product decisions from the requirements doc §12 that affect admin forms (variants attributes, order status transitions, stock display policy).
