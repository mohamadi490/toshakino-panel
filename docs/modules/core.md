# ماژول هسته (Core): API، Auth، خطا، پول

مسیر: `src/app/core/` و `src/app/shared/utilities/`. مرجع: `docs/contracts/backend-frontend-guide.md`.

## ۱) قالب داده
| قاعده | پیاده‌سازی |
|---|---|
| موفق | `{data}` ← `ApiClient.get/post/patch/put` فقط `data` را برمی‌گرداند |
| فهرست | `{data[], pagination{page,pageSize,totalItems,totalPages}}` ← `ApiClient.getPage` → `ApiPage<T>`؛ `PagedList.pagination()` |
| پول | **عدد صحیح تومان**؛ `formatMoney(toman)` بدون تبدیل؛ ورودی کاربر با `parseTomanInput` (ارقام فارسی و جداکننده هزارگان) |
| تاریخ | ISO UTC ← `formatJalaliDate/DateTime/Short` در `Asia/Tehran` |
| شناسه | عدد صحیح (پارامتر روت رشته است؛ هنگام فراخوانی `Number()`) |
| تایپ‌ها | از OpenAPI تولید می‌شود؛ مصرف فقط از `core/api/schemas.ts` |

## ۲) خطاها (`application/problem+json`)
- `ApiError.from(e)` هر خطای HTTP را نرمال می‌کند: `kind`, `status`, `message` (فارسی)، `code`, `fieldErrors`, `traceId`, `detail` (فقط برای لاگ)، `retryAfter`.
- **منطق UI روی `code`** است. پیام فارسی هر `code` در `core/api/error-messages.ts` است و تست می‌کند همه کدهای مستند راهنما پیام فارسی دارند. کد ناشناخته ← پیام عمومی بر اساس نوع (HTTP).
- `fieldErrors[]` (`{field, code, message}`) به نقشه `field → [پیام فارسی]` تبدیل می‌شود (متن انگلیسی `message` هرگز نمایش داده نمی‌شود). کدهای تداخل بدون فیلد (مثل `slug_taken`) به فیلد مربوط نسبت داده می‌شوند (`CODE_TO_FIELD`).
- برای خطاهای ۵xx کد پیگیری (`traceId`) به پیام اضافه می‌شود.
- `429` ← `retryAfter` (ثانیه) از هدر `Retry-After`.
- interceptor ها (ترتیب از بیرون به داخل): `loading` → `requestId` → `error` → `auth`.
- `X-Request-Id` (۸ تا ۶۴ نویسه مجاز) برای هر درخواست به API ارسال می‌شود تا `traceId` با لاگ بک‌اند تطبیق داده شود.

## ۳) احراز هویت ادمین
| عمل | endpoint | نکته |
|---|---|---|
| ورود | `POST /admin/auth/login` `{identifier,password}` | پاسخ `SessionRead`؛ `withCredentials` |
| تمدید | `POST /admin/auth/refresh` | **single-flight**؛ هر refresh توکن را عوض می‌کند و تکرار هم‌زمان نشست را باطل می‌کند |
| خروج | `POST /admin/auth/logout` (204) | حالت محلی حتی با خطای شبکه پاک می‌شود |
| کاربر جاری | `GET /auth/me` | `{id,email,username,mobile,fullName,role{id,name,isStaff},permissions[]}` |
- access token فقط در **حافظه**؛ refresh token کوکی HttpOnly است.
- هیچ هدر سفارشی روی این درخواست‌ها نیست (CORS فقط `Authorization, Content-Type, Idempotency-Key, X-Request-Id` را مجاز می‌داند؛ هدر `X-Requested-With` قبلی preflight را رد می‌کرد و حذف شد).
- با ۴۰۱ یک بار refresh و تکرار؛ شکست refresh ← پایان نشست و `/login?reason=expired`؛ ۴۰۳ هرگز logout نمی‌کند.
- نام نمایشی کاربر: `userDisplayName` (fullName ← username ← email ← mobile ← `#id`).

## ۴) مجوزها (تأییدشده توسط بک‌اند)
منو، روت‌ها و دکمه‌ها از `permissions` پاسخ `/auth/me` ساخته می‌شوند (UX؛ مرجع سرور است و `super_admin` همه را دارد). رجیستری در `core/authorization/permissions.ts`؛ فهرست زنده: `GET /admin/permissions`.

| ناحیه | خواندن | نوشتن |
|---|---|---|
| کاربران | `users.read` | `users.write` |
| نقش‌ها و مجوزها | `roles.read` | `roles.write` |
| دسته‌ها و برندها | `categories.write` ⚠️ | `categories.write` |
| محصولات، Variantها، ویژگی‌ها | `products.read` | `products.write` |
| نمایش موجودی (`settings/stock-display`) | `settings.read` | `settings.write` |
| سفارش‌ها (فهرست) | `orders.read` | — |
| تغییر وضعیت سفارش، `expire-unpaid` | — | `orders.update` |
| ارسال، استان/شهر | `shipping.read` | `shipping.write` |
| صفحات، تنظیمات سایت/صفحه اصلی | `content.read` | `content.write` |
| رسانه (فهرست/آپلود/حذف) | `media.write` ⚠️ | `media.write` |
| داشبورد | `dashboard.read` | — |
| سیستم | `system.read` | — |
| outbox | `outbox.read` | `outbox.write` |
⚠️ جای مجوز جداگانه «خواندن» ندارد؛ منوی مربوط با مجوز نوشتن کنترل می‌شود.

نکته: نقش پیش‌فرض `admin` همه این‌ها را ندارد (بدون `roles.*`، `users.write`، `outbox.*`، `system.read`)، پس هیچ بخشی نباید در دسترس فرض شود. داشبورد برای هر کارمند باز است و ویجت‌هایش با `dashboard.read` کنترل می‌شود.

## ۵) تست‌ها
`api-error.spec` (نگاشت code/field/trace/Retry-After/وضعیت‌ها)، `error-messages.spec` (پوشش همه کدهای مستند)، `request-id.interceptor.spec`، `auth.service.spec` (login/refresh single-flight/401/403/logout/restore با مسیرهای واقعی)، `auth.store.spec`، `money.spec`، `paged-list.spec`.

## ۶) محدودیت‌ها / سؤال‌های باز
همه پاسخ داده شد؛ تصمیم استقرار Q2 (پنل و API باید same-site باشند) در `docs/open-questions.md` و `docs/deployment.md`.

## ۷) تغییرات ناسازگار نسبت به نسخه پیش از قرارداد
پول ریال → تومان؛ `meta` → `pagination`؛ `detail` → پیام بر اساس `code`؛ مسیر ورود؛ مدل کاربر؛ حذف هدر CSRF؛ حذف `BrandService` (رنگ برند در قرارداد نیست)؛ حذف ماژول‌های `customers` و `inventory` (endpoint ندارند؛ موجودی در B7 از روی Variantها بازطراحی می‌شود).
