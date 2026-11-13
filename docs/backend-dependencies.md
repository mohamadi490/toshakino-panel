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

## ASSUMED - products (Phase 1, catalog)
Agreed endpoints: `GET/POST /admin/products`, `GET/PATCH /admin/products/{id}`, `POST /admin/products/{id}/publish|unpublish`.
| # | Assumption | Where used |
|---|---|---|
| 18 | List item: `{id, slug, title, status, categoryId?, categoryTitle?, minPriceRial?, variantCount, updatedAt, publishedAt?}`; filters `search`, `status`, `categoryId` | products list |
| 19 | Detail adds `shortDescription, description, seoTitle, seoDescription, canonicalUrl, attributes[{name,value}], variants[]` | product form |
| 20 | Variants are embedded in the product body (full replace on PATCH; a variant `id` is sent when it already exists so the server can keep SKU history/stock). Variant: `{id?, sku, options[{name,value}], priceRial, salePriceRial?, weightGrams?, isActive}` | product form |
| 21 | `attributes` (specs) and variant `options` are free `name/value` pairs in this version. The requirements doc asks for a searchable Attribute/Attribute-Value model: **a dedicated attribute catalog endpoint is needed** and the form should then switch to pickers | product form |
| 22 | Publish/unpublish return the updated product detail; the server validates publishability (>=1 active priced variant, slug, category rules) | publish button |
| 23 | Money is integer Rial; the UI enters Toman and multiplies by 10, so prices that are not multiples of 10 Rial cannot be edited exactly (they would round on display) | product form |
| 24 | Images/media: **not implemented yet** - no media endpoint is in the agreed list. Needs the upload contract (multipart vs presigned), size/MIME limits, alt text, product/variant linkage | pending |

Backend must also enforce (UI does not): SKU global uniqueness, sale price < price, deleting/archiving products with past orders, slug redirects, variant removal when stock/orders exist.

## ASSUMED - inventory (Phase 1)
Agreed endpoints: `GET /admin/inventory`, `POST /admin/inventory/adjustments`.
| # | Assumption | Where used |
|---|---|---|
| 25 | List item: `{variantId, sku, productId, productTitle, variantLabel?, onHand, reserved, available, lowStockThreshold?, updatedAt?}`; filters `search`, `lowStock`. `available` is server-computed; the UI never derives it | inventory list |
| 26 | Adjustment body `{variantId, delta (signed, non-zero int), reasonCode: received\|correction\|damaged\|returned\|other, note?}`; response = updated inventory item (the row is replaced with it) | adjust dialog |
| 27 | Header `Idempotency-Key` is honoured on adjustments: same key + same body = applied once. The UI keeps one key per distinct payload and rotates it when the payload changes | adjust dialog |
| 28 | Validation errors name fields `delta`, `reasonCode`, `note` (mapped to the form controls) | adjust dialog |
| 29 | **Adjustment history is not in the agreed endpoints.** The requirements demand history with the acting user; a read endpoint (e.g. `GET /admin/inventory/{variantId}/history`) is needed before a history view can be built | pending |

Backend must also enforce (UI does not): atomic/locked updates (no negative stock under concurrency), a decrease cannot dip below reserved stock, audit entry with the actor for every manual adjustment, `note` mandatory for reason `other`.

Backend must also enforce (UI does not): category cycles (a parent cannot be a descendant), slug uniqueness, redirect-chain avoidance, archiving a category that still has published products.

Backend must also enforce (UI does not): users cannot disable themselves or remove the last super-admin; system roles cannot be renamed/deleted; assigning roles/permissions the caller does not hold (privilege escalation) is rejected.

## ASSUMED - orders (Phase 1)
Agreed endpoints: `GET /admin/orders`, `GET /admin/orders/{id}`, `PATCH /admin/orders/{id}/status`.
| # | Assumption | Where used |
|---|---|---|
| 30 | List item `{id, number, customerName?, status, paymentStatus, shippingStatus?, itemCount, totalRial, createdAt}`; filters `search`, `status`, `paymentStatus`, `sort` (`-createdAt`, `createdAt`, `-total`, `total`) | orders list |
| 31 | Order, payment and shipping statuses are **separate open string keys**. The UI labels these keys: order `pending, confirmed, processing, shipped, delivered, cancelled, returned`; payment `initiated, pending, paid, failed, cancelled, refunded`; shipping `pending, shipped, delivered, returned`. Unknown keys are shown raw. The final key list is needed from the backend (the filters offer only the known keys) | labels, filters |
| 32 | Detail adds `customer{name,mobile,email}`, `shippingAddress{recipient,phone,province,city,address,postalCode}`, `shippingMethod`, `items[{sku,title,optionsLabel,quantity,unitPriceRial,discountRial,lineTotalRial}]` (purchase-time snapshot), `subtotalRial, discountRial, shippingRial`, `payments[]`, `history[{from,to,actor,note,at}]` | order detail |
| 33 | **`allowedTransitions: string[]` is returned by the backend** on the detail response (the state machine lives on the server). The UI offers exactly those and hardcodes no transitions. Without this field the status panel cannot work | status panel |
| 34 | `PATCH .../status` body `{status, note?}` returns the updated order detail; honours `Idempotency-Key`; a stale transition returns 409 (the UI reloads) | status panel |
| 35 | Cancelling needs `orders.cancel`, other transitions `orders.update_status` (UI hides what the role cannot do; backend decides) | status panel |
| 36 | Customer contact and address are only returned/shown with `customers.read`; without it the UI shows a "not available for your role" note. The backend should also omit them in that case | order detail |
| 37 | Not built (no agreed endpoint): internal notes, refunds, shipment tracking entry, date-range filter, export | pending |

Backend must also enforce (UI does not): transition validity (no arbitrary status), cancel/refund rules against payment and shipping state, object-level access, audit log of every status change with the actor.

## ASSUMED - customers (Phase 1)
Agreed endpoints: `GET /admin/customers`, `GET /admin/customers/{id}`.
| # | Assumption | Where used |
|---|---|---|
| 38 | List item `{id, name, mobile?, email?, ordersCount, totalSpentRial?, lastOrderAt?, createdAt, isActive?}`; filters `search`, `sort` (`-createdAt`, `-ordersCount`, `-totalSpent`) | customers list |
| 39 | Detail adds `addresses[{title, recipient, phone, province, city, address, postalCode}]` | customer detail |
| 40 | The backend decides which contact fields to return for the caller (masking, omission); the UI shows what it receives and a dash for missing values | list + detail |
| 41 | Order history uses the agreed `GET /admin/orders` with a `customerId` filter (needs `orders.read`; without it the section is replaced by a note and no request is made) | customer detail |
| 42 | Not built (no agreed endpoint): editing a customer (`customers.update`), disabling accounts, notes, export | pending |

Backend must also enforce (UI does not): object-level access, minimal PII in list responses, audit of reads of sensitive customer data if policy requires it.

## Questions for the backend team
1. Final login identifier: email, mobile or both? Any 2FA/OTP for admins?
2. Exact CSRF mechanism for the refresh cookie (header, double-submit, Origin check only)?
3. Access-token lifetime and whether permissions are re-evaluated on every request (stale-permission policy).
4. List query contract names: `page`, `pageSize`, `sort` format, filter param naming.
5. Idempotency header name for create/mutate calls (needed from Phase 1 orders/inventory).
6. Upload contract for media (multipart vs presigned URL).
7. OpenAPI URL (or file) reachable by CI for client generation and contract diff.
8. Should `PATCH /admin/users` use optimistic concurrency (`version`/`ETag`) to avoid lost updates?
9. Attribute model: fixed catalog of attributes with values (for filtering) vs free text? Variant selection policy for add-to-cart?
10. Is stale-stock protection wanted on adjustments (e.g. `expectedOnHand` so two admins cannot overwrite each other)?
11. Open product decisions from the requirements doc §12 that affect admin forms (variants attributes, order status transitions, stock display policy).
12. Please provide the final order/payment/shipping status key lists and confirm `allowedTransitions` on the order detail.
13. Should contact details in the customer list be masked for some roles? Which permission governs full PII vs masked values?
