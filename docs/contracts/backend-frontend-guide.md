# راهنمای فرانت‌اند

مرجع مصرف API برای Storefront و Admin (Angular/TypeScript). مرجع دقیق endpointها خود OpenAPI است؛ این سند فقط قواعد مشترک را می‌گوید.

## OpenAPI و تولید client

- Swagger UI: `/docs` — schema: `/openapi.json`
- `operationId` یکتا و `camelCase` است (مثلاً `listProducts`) و بین نسخه‌ها پایدار می‌ماند؛ هر tag یک گروه سرویس است (`Products`، `Cart`، `AdminOrders`، …).
- client را از `openapi.json` تولید کنید (مثلاً `ng-openapi-gen` یا `openapi-generator`) و در هر پروژه جدا نگه دارید.
- نسخه‌ی API در مسیر است: `/api/v1`. تغییر ناسازگار فقط با `/api/v2` می‌آید.

## محصول و Variant (از D2)

- قیمت، SKU و موجودی روی **Variant** است. در سبد و ثبت سفارش `variantId` می‌فرستید (نه `productId`): `POST /cart/items {variantId, quantity}`.
- `price` و `compareAtPrice` محصول در لیست‌ها قیمت ارزان‌ترین Variant موجود است (وگرنه ارزان‌ترین Variant)؛ برای «از ... تومان» در کارت محصول از همین استفاده کنید. صفحه‌ی محصول قیمت Variant انتخاب‌شده را نشان بدهد.
- `attribute` نام ویژگی (مثلاً «سایز») و `variants[].option.value.value` مقدار هر گزینه است. محصول بدون ویژگی یک Variant با `option: null` دارد.
- آدرس صفحه با `?variant={variantId}` گزینه را انتخاب می‌کند (ترب به همین آدرس لینک می‌دهد). `<link rel="canonical">` را **بدون** `variant` و از `canonicalUrl`/مسیر محصول بگذارید.
- Variant ناموجود را غیرفعال نشان بدهید (`inStock: false`)؛ افزودن آن به سبد `409` می‌دهد.
- `variants[].stock` تابع تنظیم ادمین است: `null` یعنی «عدد را نشان نده» (پیش‌فرض)؛ عدد یعنی می‌توانید «فقط N عدد» نشان بدهید. هیچ‌وقت `null` را صفر نگیرید؛ موجود بودن فقط از `inStock` خوانده می‌شود.

## کش و ETag

- پاسخ‌های عمومی (`/products`، `/products/{id}`، `/categories`، `/brands`) `ETag` و `Cache-Control: public, max-age=...` دارند. مرورگر خودش `If-None-Match` را می‌فرستد و `304` را مدیریت می‌کند؛ در SSR هم می‌توانید `ETag` را نگه دارید و دوباره بفرستید.
- بعد از تغییر قیمت یا موجودی، نسخه‌ی کش‌شده حداکثر تا `max-age` (پیش‌فرض ۳۰ ثانیه) کهنه می‌ماند. برای صفحه‌ی محصول، موجودی را با `GET /products/{id}/availability` (کم‌حجم، ۵ ثانیه) تازه کنید و پیش از افزودن به سبد/پرداخت به همین یا خود API سبد اعتماد کنید (سرور همیشه موجودی واقعی را چک می‌کند).
- پاسخ‌های سبد، سفارش، پرداخت، auth و `/admin/*` همیشه `Cache-Control: private, no-store` دارند؛ آن‌ها را در کش خودتان (CDN، service worker) نگه ندارید.
- برای خواندن `ETag` در JS از دامنه‌ی دیگر، هدر در `Access-Control-Expose-Headers` هست.

## قالب داده

| قاعده | توضیح |
|---|---|
| نام فیلدها | `camelCase` (بدنه، پاسخ و query). مقدار enumها `snake_case` است (`pending_payment`) |
| پول | عدد صحیح به **تومان** (`price`, `compareAtPrice`, `unitPrice`, `totalAmount`؛ `compareAtPrice` مرجع تخفیف است). نمایش: خودتان جداکننده‌ی هزارگان بگذارید |
| تاریخ | ISO 8601 در UTC (`2026-11-10T12:00:00Z`) |
| شناسه | عدد صحیح |
| خالی | فیلد اختیاری بدون مقدار `null` است (حذف نمی‌شود) |

## پاسخ موفق

```json
{ "data": { "id": 1, "title": "…" } }
```

فهرست‌ها:

```json
{
  "data": [ { "id": 1 } ],
  "pagination": { "page": 1, "pageSize": 20, "totalItems": 134, "totalPages": 7 }
}
```

query فهرست‌ها: `page` (از ۱) و `pageSize` (پیش‌فرض ۲۰، حداکثر ۱۰۰). `204` بدنه ندارد.

## خطا

همه‌ی خطاها `application/problem+json` هستند:

```json
{
  "type": "about:blank",
  "title": "Conflict",
  "status": 409,
  "detail": "Only 2 unit(s) of 'Pillow' in stock",
  "code": "insufficient_stock",
  "fieldErrors": [],
  "traceId": "0f3c…"
}
```

- منطق UI را روی **`code`** بگذارید، نه `detail` (متن انگلیسی و برای لاگ است).
- `422`: `fieldErrors` = `[{field, code, message}]`؛ `field` همان نام `camelCase` فیلد است.
- `429`: هدر `Retry-After` (ثانیه).
- `traceId` برابر هدر `X-Request-Id` پاسخ است؛ هنگام گزارش خطا آن را بدهید. اگر هدر `X-Request-Id` (۸ تا ۶۴ نویسه‌ی `A-Za-z0-9._-`) بفرستید، همان استفاده می‌شود.

| وضعیت | `code` |
|---|---|
| 400 | `cart_empty`، `invalid_cart_token`، `invalid_current_password` |
| 401 | `unauthorized` (توکن نیست)، `invalid_token`، `invalid_credentials`، `invalid_otp`، `invalid_refresh_token` |
| 403 | `permission_denied`، `account_disabled`، `forbidden` |
| 404 | `not_found`، `product_not_found`، `variant_not_found`، `attribute_not_found`، `attribute_value_not_found`، `category_not_found`، `brand_not_found`، `order_not_found`، `payment_not_found`، `cart_item_not_found`، `shipping_method_not_found`، `shipping_rule_not_found` |
| 409 | `insufficient_stock`، `product_unavailable`، `sku_taken`، `product_needs_variant`، `variant_option_required`، `variant_option_duplicate`، `variant_attribute_mismatch`، `attribute_name_taken`، `attribute_value_taken`، `attribute_in_use`، `attribute_value_in_use`، `slug_taken`، `category_name_taken`، `category_not_empty`، `category_has_children`، `category_cycle`، `category_too_deep`، `parent_deleted`، `brand_name_taken`، `brand_not_empty`، `email_taken`، `username_taken`، `mobile_taken`، `role_name_taken`، `role_protected`، `role_in_use`، `province_name_taken`، `city_name_taken`، `address_limit_reached`، `cannot_modify_self`، `last_super_admin`، `order_not_cancellable`، `order_not_payable`، `cart_conflict`، `rule_conflict`، `invalid_status_transition`، `conflict` |
| 404 | `user_not_found`، `role_not_found`، `province_not_found`، `city_not_found`، `address_not_found` |
| 422 | `validation_error`، `unknown_permission`، `invalid_city`، `option_value_mismatch`، `shipping_unavailable`، `city_province_mismatch`، `idempotency_key_reused` |
| 429 | `rate_limited` |
| 500 | `internal_error` |
| 503 | `sms_unavailable` |

کدهای جدید در مراحل بعد اضافه می‌شوند؛ کد ناشناخته را با پیام عمومی نشان دهید.

## احراز هویت

دو نشست مستقل وجود دارد: **فروشگاه** (مشتری) و **پنل ادمین**.

| | مشتری | ادمین |
|---|---|---|
| ورود | `POST /auth/otp/request` ← `POST /auth/otp/verify` (حساب در اولین ورود ساخته می‌شود)، یا `POST /auth/login` `{mobile, password}` | `POST /admin/auth/login` `{identifier, password}` (ایمیل یا نام کاربری) |
| تمدید | `POST /auth/refresh` | `POST /admin/auth/refresh` |
| خروج | `POST /auth/logout` | `POST /admin/auth/logout` |

- پاسخ ورود/تمدید: `{data: {accessToken, tokenType, expiresIn, isNewUser}}` (`expiresIn` ثانیه).
- `accessToken` را در **حافظه** نگه دارید (نه `localStorage`) و با `Authorization: Bearer …` بفرستید. عمر آن کوتاه (۱۵ دقیقه) است.
- refresh token در cookie `HttpOnly` است و از JavaScript دیده نمی‌شود. درخواست‌های `/auth/*` و `/admin/auth/*` را با **`withCredentials: true`** بفرستید.
- در Angular: interceptor با `401` یک‌بار `refresh` بزند و درخواست را تکرار کند. **چند درخواست هم‌زمان باید یک refresh مشترک (single-flight) بزنند**؛ هر refresh توکن را عوض می‌کند و تکرار هم‌زمان نشست را باطل می‌کند. اگر refresh هم `401` داد، کاربر به صفحه‌ی ورود برود.
- بعد از رفرش صفحه، یک `POST /…/refresh` بزنید تا نشست بازیابی شود.
- `GET /auth/me` ← `{id, email, username, mobile, fullName, role: {id, name, isStaff}, permissions: [...]}`؛ منوی پنل ادمین را از `permissions` بسازید (کنترل واقعی در سرور است).
- `PATCH /auth/me` پروفایل را ویرایش می‌کند؛ `PUT /auth/password` رمز را عوض می‌کند و **همه‌ی نشست‌ها بسته می‌شود** (دوباره وارد شوید).
- OTP: پاسخ `/otp/request` شامل `expiresIn` و `resendAfter` (ثانیه) است؛ از آن برای شمارنده‌ی «ارسال مجدد» استفاده کنید.
- `401` ← ورود دوباره (بعد از تلاش refresh)؛ `403` ← مجوز ندارد (`permission_denied`؛ `detail` نام مجوز را می‌گوید).

## استان، شهر و نشانی

- `GET /provinces` و `GET /provinces/{id}/cities` عمومی‌اند (بدون pagination). برای فرم نشانی دو `select` وابسته بسازید و `cityId` را بفرستید؛ استان از شهر مشخص می‌شود.
- نشانی‌های مشتری: `GET/POST /addresses`، `GET/PATCH/DELETE /addresses/{id}` (نیاز به ورود). پاسخ شامل `province` و `city` (`{id, name}`) است.
- اولین نشانی خودکار پیش‌فرض است؛ برای تغییر `PATCH {isDefault: true}`. سقف ۱۰ نشانی.
- `postalCode` ده رقم است (ارقام فارسی هم پذیرفته می‌شود)؛ موبایل گیرنده در هر فرمت متداول پذیرفته و نرمال می‌شود.

## CORS

originهای مجاز در سرور تنظیم می‌شوند (`CORS_ORIGINS`). `credentials` فعال است؛ پس در Angular برای مسیرهای refresh `withCredentials: true` لازم می‌شود. هدرهای مجاز: `Authorization`، `Content-Type`، `Idempotency-Key`، `X-Request-Id`.

## مسیرها (نسخه‌ی فعلی)

پیشوند همه `/api/v1`. 🔒 = نیاز به توکن، 👑 = فقط ادمین.

| بخش | مسیر |
|---|---|
| Auth | `POST /auth/otp/request`، `/auth/otp/verify`، `/auth/login`، `/auth/refresh`، `/auth/logout`، 🔒 `GET/PATCH /auth/me`، 🔒 `PUT /auth/password` |
| جغرافیا | `GET /provinces`، `GET /provinces/{id}/cities` |
| نشانی 🔒 | `GET/POST /addresses`، `GET/PATCH/DELETE /addresses/{id}` |
| دسته‌ها | `GET /categories` (درخت تو در تو با `children`)، `GET /categories/{slug}` (breadcrumb، فرزندان، SEO) |
| برندها | `GET /brands`، `GET /brands/{slug}` |
| محصولات | `GET /products` (`q`، `categoryId`، `categorySlug`، `brandSlug`، `minPrice`، `maxPrice`، `inStock`، `sort`)، `GET /products/{slugOrId}` (شامل `variants[]`، `attribute`، `price` نمایشی، `inStock`، `stock` طبق تنظیم ادمین)، `GET /products/{slugOrId}/availability` |
| محتوا | `GET /pages`، `GET /pages/{slug}` (`body` همان HTML پاک‌سازی‌شده؛ می‌توانید مستقیم رندر کنید)، `GET /site` (برند/تماس)، `GET /home` (همه‌ی داده‌ی صفحه‌ی اصلی در یک درخواست)، `GET /seo/sitemap-data` (برای ساخت `sitemap.xml` در SSR) |
| سبد (کاربر یا مهمان) | `GET /cart`، `POST /cart/items`، `PUT /cart/items/{variantId}`، `DELETE /cart/items/{variantId}`، `DELETE /cart`؛ مهمان: هدر `X-Cart-Token`؛ `POST /cart/merge` 🔒 بعد از ورود |
| ارسال 🔒 | `GET /checkout/shipping-options?addressId=` ← `[{methodId, name, description, icon, cost, isFree}]` |
| سفارش 🔒 | `POST /orders` `{addressId, shippingMethodId}` (+ هدر `Idempotency-Key`)، `GET /orders`، `GET /orders/{id}`، `POST /orders/{id}/cancel` |
| پرداخت 🔒 | `POST /orders/{id}/pay` ← `paymentUrl` (هدایت مرورگر به آن). بعد از پرداخت مشتری به `PAYMENT_RESULT_URL?orderId=&status=success\|failed` برمی‌گردد؛ خطای `502 gateway_unavailable` یعنی درگاه در دسترس نبود، دوباره تلاش کنید |
| ادمین 👑 | `/admin/auth/*`، `/admin/categories`، `/admin/products` (+ `/{id}/variants`)، `/admin/attributes`، `/admin/settings/stock-display`، `/admin/orders` (+ `PATCH /admin/orders/{id}/status`)، `/admin/users`، `/admin/roles`، `/admin/permissions`، `/admin/provinces`، `/admin/cities`، `/admin/shipping/methods` (+ `/{id}/rules`)، `/admin/pages`، `/admin/settings/site`، `/admin/settings/home`، `/admin/dashboard?days=` (خلاصه‌ی فروش و عملیات؛ `series` برای نمودار)، `/admin/system` (سلامت سیستم، `system.read`)، `/admin/media` (آپلود `multipart/form-data` با فیلد `file`؛ `url` پاسخ را در محصول/بنر/لوگو بگذارید) — هر مسیر مجوز خودش را می‌خواهد |

مقدارهای enum: سفارش `pending_payment | paid | shipped | delivered | cancelled`؛ پرداخت `pending | succeeded | failed`؛ مرتب‌سازی محصول `newest | price_asc | price_desc | title`.

## جریان خرید

1. `POST /cart/items` (مهمان هم می‌تواند) → 2. ورود/ثبت‌نام، سپس `POST /cart/merge` با همان `X-Cart-Token` → 3. انتخاب یا ساخت نشانی (`/addresses`) → 4. نمایش روش‌های ارسال همان نشانی با `GET /checkout/shipping-options?addressId=` و انتخاب یکی → 5. `POST /orders {addressId, shippingMethodId}` (موجودی رزرو می‌شود) → 6. `POST /orders/{id}/pay` → هدایت به `paymentUrl` → 7. بعد از بازگشت، `GET /orders/{id}` را بخوانید و فقط به `status` سرور اعتماد کنید (نه به redirect).

### سبد مهمان

- اولین `POST /cart/items` بدون توکن سبد می‌سازد و `data.cartToken` را برمی‌گرداند؛ آن را در `localStorage` نگه دارید و در هر درخواست سبد به‌صورت هدر `X-Cart-Token` بفرستید. `GET /cart` بدون توکن سبد خالی است.
- بعد از ورود، یک‌بار `POST /cart/merge` (با توکن) را بزنید و توکن را دور بریزید: تعدادها جمع می‌شوند (حداکثر موجودی) و قلم‌های ناموجود حذف می‌شوند. وقتی کاربر وارد شده است، `X-Cart-Token` نادیده گرفته می‌شود.
- سبد مهمان بعد از ۳۰ روز بی‌استفاده‌بودن پاک می‌شود. ثبت سفارش فقط برای کاربر واردشده است (checkout مهمان در [future.md](future.md)).

### ثبت سفارش و `Idempotency-Key`

- برای هر تلاش ثبت سفارش یک UUID بسازید و در هدر `Idempotency-Key` بفرستید؛ اگر درخواست timeout شد یا کاربر دو بار کلیک کرد، **همان کلید و همان بدنه** را دوباره بفرستید. پاسخ همان سفارش است با هدر `Idempotent-Replayed: true`. کلید با بدنه‌ی دیگر `422 idempotency_key_reused` می‌دهد. تلاش ناموفق (۴xx) کلید را مصرف نمی‌کند.
- روش‌های ارسال را **سرور** می‌دهد (نام، توضیح، آیکن، قیمت برای همین سبد و نشانی)؛ هیچ‌چیز را در فرانت ثابت نکنید. با عوض‌شدن نشانی یا سبد دوباره بخوانید؛ فهرست خالی یعنی به این نشانی ارسال نداریم. `icon` کلید یا URL است. اگر قاعده بین نمایش و ثبت عوض شده باشد `422 shipping_unavailable` می‌گیرید: فهرست را دوباره بگیرید. `totalAmount = itemsAmount + shippingCost` و مبلغ پرداخت همین است؛ سفارش `shippingMethodName` را نگه می‌دارد.
- هر سفارش `number` خوانا (مثل `TK-10001`)، نشانی ثبت‌شده (`shipping`) و `statusHistory` دارد؛ شماره را به مشتری نشان بدهید، نه `id` را.

سفارش پرداخت‌نشده بعد از ۳۰ دقیقه (تنظیم‌پذیر) خودکار لغو و موجودی آزاد می‌شود.

## استثناها

- `GET /health/live` و `/health/ready`: بدون envelope.
- فید ترب (`/torob/products`): قرارداد خود ترب (`snake_case`، بدون envelope)؛ برای فرانت نیست.

## slug، redirect و SEO (کاتالوگ)

- صفحه‌ی محصول/دسته/برند با **slug** باز می‌شود. اگر slug قدیمی باشد API پاسخ `301` با هدر `Location` و بدنه‌ی `{"data":{"slug":"جدید"}}` می‌دهد؛ در SSR همان redirect را به مرورگر برگردانید.
- محصول را می‌شود با id عددی هم گرفت، ولی URL عمومی را با slug بسازید (slug هیچ‌وقت فقط عدد نیست).
- `seoTitle`، `seoDescription`، `canonicalUrl` را در `<head>` استفاده کنید؛ در صورت `null` از عنوان/توضیح خود صفحه.
- `images[].alt` را برای `alt` تصویر به کار ببرید.
- دسته‌ی `draft` یا والد پنهان‌شده با کل زیردرخت از نمای عمومی حذف می‌شود؛ فیلتر محصولات با دسته شامل زیردسته‌ها هم هست.
