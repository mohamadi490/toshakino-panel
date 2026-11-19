# پاسخ بک‌اند به تحلیل قرارداد و سؤال‌های باز پنل

> **مبنا و محدودیت:** این پاسخ‌ها از روی **کد واقعی ریپو `toshakino-api` (شاخه main)** نوشته شده‌اند، نه از اجرای سرور. فایل `openapi.json` در دسترس من نبود؛ مقایسه با «متن تحلیل شما» و کد انجام شد. اگر OpenAPI فعلی چیز دیگری می‌گوید، **کد/OpenAPI مرجع است** و همین فایل باید اصلاح شود.
> برچسب‌ها: ✅ = همین‌طور که ساخته شده · ⚠️ = اختلاف/نکته برای پنل · 🔧 = شکاف بک‌اند (پیشنهاد، هنوز ساخته نشده).

---

## بخش ۱) مغایرت‌ها و نکات روی `contract-analysis.md`

### ۱.۱ اختلاف‌های سراسری

| ردیف تحلیل | وضعیت | نکته |
|---|---|---|
| واحد پول: عدد صحیح تومان، فیلد `price` | ✅ | درست است. فقط هنگام اتصال به زرین‌پال ×۱۰ می‌شود (داخل بک‌اند). پنل هیچ تبدیلی نمی‌خواهد. |
| شناسه‌ها عدد صحیح | ✅ | |
| `pagination{page,pageSize,totalItems,totalPages}` | ✅ | فقط روی فهرست‌های صفحه‌بندی‌شده. فهرست نقش‌ها، برندها، دسته‌ها، ویژگی‌ها، روش‌های ارسال، استان‌ها و صفحات **صفحه‌بندی ندارند** (آرایه ساده در `data`). |
| `fieldErrors[{field,code,message}]` | ✅ | `message` انگلیسی است. `field` به شکل camelCase (مثلاً `cityId`). |
| منطق UI روی `code` | ✅ | فهرست کامل کدها در پیوست ب. |
| `POST /admin/auth/login` و `refresh/logout` | ✅ | کوکی refresh ادمین: نام `admin_refresh_token`، مسیر `/api/v1/admin/auth` (پیشوند را با `API_PREFIX` چک کنید). کوکی مشتری جداست (`refresh_token`). |
| `/auth/me` با یک نقش | ✅ | |
| هدر `X-Requested-With` در CORS مجاز نیست | ✅ | درست؛ حذفش درست است. (پاسخ Q2 را ببینید.) |
| `Idempotency-Key` فقط `POST /orders` | ✅ | |
| `/admin/*` همیشه `private, no-store` | ✅ | |
| `X-Request-Id` → `traceId` | ✅ | اگر ارسال شود همان در لاگ و `traceId` می‌آید؛ در غیر این صورت سرور می‌سازد. |
| تاریخ ISO UTC و `series[].date` فقط تاریخ | ⚠️ | `series[].date` روز را بر اساس **`BUSINESS_TIMEZONE`** (پیش‌فرض Asia/Tehran) می‌سازد، نه UTC. روز تقویمی ایران را نمایش دهید و دوباره به منطقه زمانی مرورگر تبدیل نکنید. |

### ۱.۲ مغایرت‌ها و نکاتی که در تحلیل نیامده

1. **تحلیل می‌گوید «بدون `productCount` برای دسته‌ها»** ✅ درست است. ولی حذف دسته با محصول زنده → `409 category_not_empty`، با زیردسته → `category_has_children`. UI باید این دو را مجزا پیام بدهد.
2. **مجوز برندها = `categories.write`** (نه `brands.*`). حتی **خواندن** فهرست/جزئیات برند و دسته در ادمین `categories.write` می‌خواهد؛ مجوز `categories.read` وجود ندارد. 🔧 پیشنهاد: افزودن `categories.read`. تا آن زمان، منوی «دسته‌ها/برندها» را با `categories.write` کنترل کنید.
3. **ویژگی‌ها (attributes) = `products.read/products.write`** (مجوز جدا ندارند).
4. **رسانه:** فقط `media.write` وجود دارد و هم **فهرست** و هم آپلود و حذف را می‌پوشاند. endpoint ویرایش `alt` وجود ندارد (فقط `POST` آپلود / `GET` فهرست / `DELETE`).
5. **تنظیمات `stock-display`** = `settings.read/write`؛ اما `settings/site` و `settings/home` = `content.read/write` (نه `settings.*`). تحلیل شما این سه را کنار هم گذاشته؛ مجوزشان یکی نیست.
6. **ارسال، استان/شهر، قواعد:** همه `shipping.read/shipping.write`. استان‌ها/شهرها در ادمین هم صفحه‌بندی ندارند.
7. **`/admin/outbox`** مجوزهای `outbox.read`/`outbox.write` دارد (برای retry). `expire-unpaid` زیر `orders.update` است.
8. **`/admin/system`** → `system.read`؛ **`/admin/dashboard`** → `dashboard.read`.
9. **نقش پیش‌فرض `admin`**: فقط در **اولین ساخت** مجوزهای پیش‌فرض می‌گیرد (`products.*`، `categories.write`، `orders.*`، `users.read`، `shipping.*`، `settings.*`، `content.*`، `media.write`، `dashboard.read`). نقش `admin` بدون `roles.*`، `users.write`، `outbox.*`، `system.read` است. روی دیتابیسِ موجود، مجوزهای جدید (content/media/dashboard/system) **خودکار به نقش‌های موجود داده نمی‌شوند**؛ فقط `super_admin` همه را دارد. پنل نباید فرض کند ادمین معمولی همه منوها را می‌بیند.
10. **«مشتری‌ها»**: در ادمین ماژول جدا نیست ✅ (درست). ماژول `customers` موجود در ریپو مربوط به **API مشتری (storefront)** است (پروفایل/آدرس)، نه پنل.
11. **سفارش:** `shipping` snapshot ممکن است `null` باشد (سفارش‌های قدیمی قبل از مرحله F). مدل را `nullable` بگیرید.
12. **حذف نرم:** `deleted` روی فهرست دسته، برند، محصول و Variant هست. (فیلتر تب «حذف‌شده‌ها».)
13. **اسلاگ تغییرکرده → ریدایرکت**: اسلاگ قدیمی در جدول `slug_redirects` ثبت می‌شود و اسلاگ قدیمی تا وقتی مالک دارد برای دیگری قابل استفاده نیست (`slug_taken`).
14. **پاسخ ادمین برای محصول** مبلغ‌ها به تومان؛ قیمت قبل از تخفیف/تخفیف را از schema فعلی بخوانید (در این فایل بررسی نشد).

---

## بخش ۲) پاسخ سؤال‌های باز (Q1–Q18)

### Q1 — مجوزها ✅
کدهای ثبت‌شده (رجیستری `identity/permissions.py`):

`products.read` · `products.write` · `categories.write` · `orders.read` · `orders.update` · `users.read` · `users.write` · `roles.read` · `roles.write` · `outbox.read` · `outbox.write` · `shipping.read` · `shipping.write` · `settings.read` · `settings.write` · `content.read` · `content.write` · `media.write` · `dashboard.read` · `system.read`

نام‌ها **همان `<منبع>.<عملیات>` نیستند** (مثلاً `orders.update` نه `orders.write`؛ `categories.write` برای برند هم). جدول endpoint ← مجوز در **پیوست الف** است. `super_admin` همیشه همه را دارد. `GET /admin/permissions` فهرست زنده را می‌دهد؛ منبع حقیقت همان است.

### Q2 — CSRF برای refresh ⚠️
- refresh فقط با **کوکی HttpOnly** و مسیر محدود (`…/admin/auth`) کار می‌کند؛ مقدار `SameSite` از تنظیمات (`COOKIE_SAMESITE`، پیش‌فرض **`lax`**).
- **چرخش (rotation) + تشخیص استفاده مجدد** دارد: استفاده دوباره از refresh قدیمی کل نشست را باطل می‌کند.
- **بررسی Origin/هدر سفارشی نداریم.** حفاظت متکی بر `SameSite`+CORS با لیست صریح مبداهاست (`*` ممنوع است).
- ⚠️ پنل Angular روی `localhost:4200` و API روی پورت دیگر **same-site** هستند (localhost) و کوکی می‌رود. در production اگر پنل و API روی دامنه‌های **متفاوت (cross-site)** باشند، `lax` کوکی را در `fetch` نمی‌فرستد؛ باید `SameSite=None; Secure` یا زیردامنه‌های یک دامنه باشند. این یک تصمیم استقرار است.
- 🔧 پیشنهاد: بررسی هدر `Origin` روی `/auth/*/refresh` و logout در بک‌اند (بدون نیاز به هدر سفارشی).

### Q3 — انتقال وضعیت سفارش ✅
ماشین وضعیت ادمین (دقیقاً از کد):

| از | به |
|---|---|
| `pending_payment` | `cancelled` |
| `paid` | `shipped`، `cancelled` |
| `shipped` | `delivered` |
| `delivered` | — |
| `cancelled` | — |

نکته‌ها: `pending_payment → paid` را **ادمین نمی‌زند**؛ فقط تأیید پرداخت (verify درگاه) انجام می‌دهد. لغو، موجودی را برمی‌گرداند. انتقال غیرمجاز → `409 invalid_status_transition`. وضعیت‌های دیگر همان پنج مقدار بالاست. 🔧 `allowedTransitions` در `OrderRead` پیشنهاد می‌شود؛ تا آن موقع جدول بالا را در UI بگذارید (یا فقط مقصدهای مجاز را پیشنهاد دهید).

### Q4 — سفارش‌ها: جزئیات، جستجو، مشتری، پرداخت 🔧
تأیید: الان فقط فهرست (فیلتر `status`، `userId`) + تغییر وضعیت وجود دارد. همه موارد درخواستی (`GET /admin/orders/{id}`، `q`، بازه تاریخ، مرتب‌سازی، نام/موبایل مشتری، پرداخت‌ها) **ساخته نشده** و جزو بک‌لاگ پیشنهادی است (پیوست ج). رفتار موقت پنل (پنل کشویی از داده فهرست) درست و کافی است.

### Q5 — مشتری‌ها
بله، مشتری = کاربر با نقش غیرکارمند (`role.isStaff=false`؛ نقش سیستمی `customer`). 🔧 فیلتر `isStaff` روی `/admin/users` را پیشنهاد می‌کنیم؛ الان فیلتر نقش (`roleId`) را استفاده کنید. تعداد مشتری در داشبورد هست.

### Q6 — موجودی 🔧
- بله، `PATCH variant {stock}` **مقدار مطلق** است و می‌تواند تعدیل هم‌زمان را بازنویسی کند. نه `version`/`If-Match` داریم، نه تاریخچه/دلیل، نه `delta`.
- ✅ در سطح **checkout**، کاهش موجودی با قفل ردیف و شرط اتمی انجام می‌شود؛ مشکل فقط تنظیم دستی ادمین است.
- فهرست موجودی: همان `GET /admin/products` + Variantها. 🔧 پیشنهاد: `GET /admin/inventory?lowStock=&q=` و `POST …/variants/{id}/stock-adjustments {delta, reason}` با تاریخچه.
- رفتار موقت پنل (هشدار روی مقدار مطلق، بدون تاریخچه) درست است.

### Q7 — ویرایش ایمیل/موبایل/نام کاربری
تأیید: در `UserUpdate` فقط `fullName/roleId/isActive/newPassword` است؛ **عمداً** (هویت ورود و OTP/تأیید به آن‌ها وابسته است). تغییر ایمیل/موبایل/username برای کارمند در حال حاضر ممکن نیست. قواعد مرتبط: `cannot_modify_self` (ادمین نمی‌تواند نقش/وضعیت خودش را عوض کند) و `last_super_admin` (آخرین super_admin قابل تنزل/غیرفعال‌سازی نیست).

### Q8 — کدهای خطا و زبان ✅
`message` و `detail` **انگلیسی** هستند. `fieldErrors[].code` برای ورودی‌های Pydantic همان کدهای استاندارد validation است (مثلاً `string_too_short`, `missing`, `value_error`) و برای قواعد دامنه کدهای خاص (`invalid_city`, `city_province_mismatch`, `slug_taken` …). فهرست کامل کدهای **سطح درخواست** در پیوست ب. نگاشت فارسی را با کدهای شناخته‌شده انجام دهید و برای بقیه پیام عمومی + `field` نشان دهید (همان رفتار موقت شما).

### Q9 — رسانه ✅
- سقف حجم: **۵ مگابایت** (`MEDIA_MAX_BYTES`)؛ بیشتر → `413 media_too_large`، فایل خالی → `media_empty`.
- نوع‌ها با **magic bytes** تشخیص داده می‌شود (نه پسوند/Content-Type). **SVG مجاز نیست**؛ فقط **JPEG، PNG، GIF و WebP** پذیرفته می‌شود؛ نوع دیگر → `422 media_unsupported_type`.
- نام فایل ذخیره‌شده تصادفی است؛ فایل‌ها زیر `/media/…` سرو می‌شوند.
- ⚠️ **حذف فایلِ در حال استفاده رد نمی‌شود** (`media_in_use` وجود ندارد)؛ فقط `media_not_found`. URL تصویر در محصول/صفحه یک رشته است و وابستگی ندارد؛ پس حذف می‌تواند لینک شکسته بسازد. 🔧 پیشنهاد: بررسی ارجاع‌ها.
- ویرایش `alt` بعد از آپلود: **ممکن نیست**؛ `alt` در خود محصول/دسته/برند ذخیره می‌شود نه روی رسانه.

### Q10 — تصاویر محصول ✅/⚠️
- `images: [{url, alt}]` حداکثر **۲۰** مورد؛ ترتیب آرایه = ترتیب نمایش (position از ایندکس).
- اولین تصویر شاخص است (کارت/صفحه محصول از اولی استفاده می‌کند).
- `alt` **اختیاری** است (`max 200`)، توصیه می‌شود.
- در `PATCH` اگر `images` را بفرستید **کل آرایه جایگزین** می‌شود؛ نفرستید = بدون تغییر.

### Q11 — صفحات (HTML) ✅
- `body` یک HTML است که با **sanitizer مبتنی بر allow-list (کتابخانه استاندارد پایتون)** پاک‌سازی می‌شود؛ تگ‌ها/صفت‌های ناامن (script، on*، javascript:) حذف می‌شود. فهرست تگ‌های مجاز در `content/sanitize.py` است.
- sanitize در **ذخیره** انجام می‌شود؛ خروجی را کامل برمی‌گردانیم. پس پیش‌نمایش سمت کلاینت فقط برای راحتی است و ممکن است با نسخه ذخیره‌شده کمی فرق کند.
- WYSIWYG انتظار خاصی نداریم؛ خروجی هر ویرایشگر HTML-ساز پذیرفته می‌شود. `textarea` + پیش‌نمایش برای فاز اول کافی است.
- اسلاگ صفحه یکتاست (`page_slug_taken`)؛ حذف/به‌روزرسانی از `PUT` است (نه `PATCH`).

### Q12 — معنی `null` در PATCH/PUT ⚠️ (مهم)
کد روی **`exclude_unset`** است:

- **فیلد ارسال‌نشده = تغییر نده.**
- **فیلد ارسال‌شده با `null` = پاک کن** (برای فیلدهای nullable مثل `imageUrl`, `subtitle`, `description`).
- استثنا: در **Variant** بعضی فیلدها `null` را نادیده می‌گیرند (نمی‌توان مقدار ضروری را خالی کرد). فیلدهای الزامی (مثل `name`) با `null` → `422`.
- نقش‌ها: `description` با `model_fields_set` تشخیص می‌دهد؛ همان قاعده.
- صفحات و تنظیمات سایت/خانه `PUT` هستند ولی همین منطق «فقط فیلدهای ارسال‌شده» را دارند.

پس رفتار موقت پنل («فقط تغییرکرده‌ها، `null` صریح برای پاک‌کردن») **دقیقاً درست** است.

### Q13 — slug ✅
- اگر `slug` خالی/`null`/ارسال‌نشده باشد، از **نام** ساخته می‌شود (حروف یونیکد/فارسی حفظ می‌شود؛ فاصله → `-`).
- اسلاگ **صرفاً عددی نمی‌شود** (برای محصول `p-123`؛ چون عدد در URL شناسه محسوب می‌شود).
- اگر تکراری باشد: در حالت **خودکار** پسوند `-2`, `-3`… می‌گیرد؛ اگر **کاربر صریحاً** اسلاگ بدهد و تکراری باشد → `409 slug_taken`.
- با تغییر اسلاگ، اسلاگ قدیمی در `slug_redirects` ثبت می‌شود (بدون زنجیره ریدایرکت) و storefront به اسلاگ جدید هدایت می‌کند. هشدار هنگام تغییر منطقی است چون URL عمومی عوض می‌شود.
- اسلاگ **در بین موارد زنده** یکتاست؛ آیتم حذف‌شده نرم اسلاگش را آزاد می‌کند.

### Q14 — `specs`
آبجکت آزاد JSONB است: `{ "کلید": "مقدار" }`؛ سرور ساختار خاصی را الزام نمی‌کند. برای سازگاری با storefront **کلید/مقدار متنی** بفرستید. ترتیب نمایش کلیدها تضمین‌شده نیست (آبجکت)؛ اگر ترتیب مهم است 🔧 باید به آرایه `[{key,value}]` تغییر کند (تصمیم مشترک).

### Q15 — ارسال ✅
- **اولویت قاعده:** شهر ← استان ← سراسری. (قاعده شهر بر استان و استان بر سراسری غالب است.)
- یک قاعده برای هر `(روش، شهر)` یا `(روش، استان)` یا سراسری؛ `PUT` همان محدوده را **جایگزین** می‌کند (set). خطاها: `city_province_mismatch`, `rule_conflict`, `shipping_rule_not_found`.
- `costType`: `fixed` (با `cost`) یا `weight` (با `weightTiers`).
- `weightTiers`: `upToGrams` باید **اکیداً صعودی** باشد و **فقط پله آخر (و حتماً آن) `upToGrams: null`** دارد (= بدون سقف). پس هر وزنی پوشش داده می‌شود؛ نقض این قاعده `422` اعتبارسنجی می‌دهد. قاعده `fixed` فقط `cost` و قاعده `weight` فقط `weightTiers` می‌خواهد (نه هر دو).
- `freeOverAmount`: اگر مجموع اقلام (تومان) ≥ آن مقدار، هزینه ۰ می‌شود.
- **اجبار قاعده برای روش فعال وجود ندارد:** روش فعال بدون قاعده برای شهر مشتری در گزینه‌ها **نمایش داده نمی‌شود**. پس اگر هیچ گزینه‌ای نباشد checkout با `shipping_unavailable` رد می‌شود. 🔧 پیشنهاد: هشدار در پنل «روش فعال بدون هیچ قاعده».
- استان/شهر غیرفعال برای آدرس جدید پذیرفته نمی‌شود (`invalid_city`).

### Q16 — داشبورد
- `revenue` = مجموع مبلغ سفارش‌های **پرداخت‌شده** (طبق توضیح schema: وضعیت‌های paid/shipped/delivered؛ لغوشده و در انتظار پرداخت شامل نیست). `averageOrderValue = revenue ÷ paidOrders` (تقسیم صحیح؛ بدون سفارش = ۰).
- `days` بین ۱ تا ۳۶۵؛ روزها بر مبنای `BUSINESS_TIMEZONE`؛ روزهای بدون فروش با صفر پر می‌شوند.
- مقایسه با دوره قبل: **نیست** 🔧 (پیشنهاد: `compare=true` که همان بازه قبلی را برگرداند). فعلاً با دو بار فراخوانی (`days=7` و تاریخ‌های قبلی) ممکن نیست چون بازه شروع قابل تنظیم نیست؛ پس بدون مقایسه نمایش دهید.

### Q17 — نقش‌ها
- `GET /admin/roles/{id}` **نداریم**؛ فهرست **کامل و بدون صفحه‌بندی** است و `permissions` هر نقش در همان فهرست می‌آید ✅.
- نقش‌های سیستمی `super_admin` و `customer` ثابت‌اند: نام/حذف‌شان `role_protected`؛ حذف نقشِ دارای کاربر → `role_in_use`؛ نام تکراری → `role_name_taken`؛ کد مجوز نامعتبر → `unknown_permission`.
- فرم از فهرست خوانده شود ✅.

### Q18 — حریم خصوصی آدرس/موبایل گیرنده
هیچ مجوز جداگانه‌ای (PII) نیست؛ هر کاربری با `orders.read` همه فیلدهای `shipping` (نام، موبایل، استان، شهر، کدپستی) را می‌بیند. 🔧 اگر لازم است، مجوز `orders.read_pii` اضافه و فیلدها ماسک شوند. تا آن موقع رفتار موقت پنل درست است.

---

## پیوست الف) جدول endpoint ← مجوز (ادمین)

| ناحیه | خواندن | نوشتن |
|---|---|---|
| کاربران `/admin/users` | `users.read` | `users.write` |
| نقش‌ها و مجوزها `/admin/roles`, `/admin/permissions` | `roles.read` | `roles.write` |
| دسته‌ها `/admin/categories` (+restore) | `categories.write` ⚠️ | `categories.write` |
| برندها `/admin/brands` (+restore) | `categories.write` ⚠️ | `categories.write` |
| محصولات و Variantها `/admin/products` | `products.read` | `products.write` |
| ویژگی‌ها و مقادیر `/admin/attributes` | `products.read` | `products.write` |
| تنظیم نمایش موجودی `/admin/settings/stock-display` | `settings.read` | `settings.write` |
| سفارش‌ها (فهرست) | `orders.read` | — |
| تغییر وضعیت سفارش، `expire-unpaid` | — | `orders.update` |
| روش/قاعده ارسال، استان، شهر | `shipping.read` | `shipping.write` |
| صفحات `/admin/pages` | `content.read` | `content.write` |
| `/admin/settings/site`, `/admin/settings/home` | `content.read` | `content.write` |
| رسانه `/admin/media` (فهرست/آپلود/حذف) | `media.write` ⚠️ | `media.write` |
| داشبورد `/admin/dashboard` | `dashboard.read` | — |
| سیستم `/admin/system` | `system.read` | — |
| outbox `/admin/outbox` | `outbox.read` | `outbox.write` (retry) |
| ورود/refresh/logout ادمین | عمومی (بدون مجوز) | — |

> ⚠️ = جای مجوز مجزا برای «خواندن» ندارد (در بک‌لاگ).
> نکته: پاسخ `403` با `code=permission_denied`، و کاربر غیر کارمند روی realm ادمین `forbidden`/`invalid_credentials` می‌گیرد.

## پیوست ب) کدهای خطا برای نگاشت پیام فارسی

**عمومی/احراز هویت:** `validation_error` · `invalid_credentials` · `invalid_token` · `invalid_refresh_token` · `account_disabled` · `permission_denied` · `forbidden` · `rate_limited` · `conflict` · `internal_error` (۵xx؛ `traceId` را نشان دهید) · `gateway_unavailable` (۵۰۲) · `sms_unavailable` · `invalid_otp` · `invalid_current_password`

**کاربران/نقش‌ها:** `user_not_found` · `cannot_modify_self` · `last_super_admin` · `role_not_found` · `role_name_taken` · `role_protected` · `role_in_use` · `unknown_permission`

**کاتالوگ:** `category_not_found` · `category_name_taken` · `category_cycle` · `category_has_children` · `category_not_empty` · `category_too_deep` · `parent_deleted` · `brand_not_found` · `brand_name_taken` · `brand_not_empty` · `slug_taken` · `product_not_found` · `product_unavailable` · `product_needs_variant` · `variant_not_found` · `sku_taken` · `variant_option_required` · `variant_option_duplicate` · `variant_attribute_mismatch` · `option_value_mismatch` · `attribute_not_found` · `attribute_name_taken` · `attribute_in_use` · `attribute_value_not_found` · `attribute_value_taken` · `attribute_value_in_use`

**سفارش/سبد/پرداخت:** `order_not_found` · `invalid_status_transition` · `order_not_cancellable` · `order_not_payable` · `payment_not_found` · `insufficient_stock` · `cart_empty` · `cart_conflict` · `cart_item_not_found` · `invalid_cart_token` · `idempotency_key_reused`

**ارسال/آدرس:** `province_not_found` · `province_name_taken` · `city_not_found` · `city_name_taken` · `city_province_mismatch` · `invalid_city` · `shipping_method_not_found` · `shipping_rule_not_found` · `rule_conflict` · `shipping_unavailable` · `address_not_found` · `address_limit_reached`

**رسانه/محتوا/outbox:** `media_not_found` · `media_empty` · `media_too_large` (۴۱۳) · `media_unsupported_type` · `page_not_found` · `page_slug_taken` · `outbox_event_not_found` · `outbox_event_not_failed`

> کدهای `fieldErrors[].code` علاوه بر اینها کدهای استاندارد Pydantic هستند (`missing`, `string_too_short`, `greater_than_equal`, `string_pattern_mismatch` …).

## پیوست ج) بک‌لاگ پیشنهادی بک‌اند (اولویت‌بندی با شما)

| # | مورد | دلیل | اولویت |
|---|---|---|---|
| ۱ | `GET /admin/orders/{id}` + `q` (شماره/موبایل) + بازه تاریخ + مرتب‌سازی + نام/موبایل مشتری | Q4 | بالا |
| ۲ | `allowedTransitions` در `OrderRead` | Q3 | متوسط |
| ۳ | پرداخت‌ها در جزئیات سفارش ادمین (`PaymentRead`: وضعیت، refId، کارت ماسک) | Q4 | بالا |
| ۴ | تعدیل نسبی موجودی `delta` + دلیل + تاریخچه، `GET /admin/inventory` | Q6 | بالا |
| ۵ | مجوزهای `categories.read` و `media.read` | الف | متوسط |
| ۶ | فیلتر `isStaff` روی `/admin/users` | Q5 | پایین |
| ۷ | بررسی Origin روی refresh | Q2 | متوسط |
| ۸ | بررسی ارجاع هنگام حذف رسانه (`media_in_use`) و ویرایش `alt` | Q9 | پایین |
| ۹ | مقایسه با دوره قبل در داشبورد | Q16 | پایین |
| ۱۰ | `GET /admin/roles/{id}` | Q17 | پایین |
| ۱۱ | ماسک PII سفارش با مجوز جدا | Q18 | پایین |

### موارد production باز (از roadmap)
کلید واقعی زرین‌پال و تأیید جزئیات API آن (مستندات هنگام ساخت در دسترس من نبود → **تأییدنشده**) · ارسال پیامک واقعی (Kavenegar) · هدف invalidation کش storefront · اجرای migrationها روی کپی داده واقعی · اعطای مجوزهای جدید به نقش `admin` در DBهای موجود · هزینه واقعی پست.

---

### آنچه اجرا/تأیید نشده است
- مقایسه از روی **کد** انجام شد؛ سرور اجرا نشد و `openapi.json` را ندیدم.
- در این محیط PostgreSQL/Docker نیست؛ تست‌ها را شما اجرا می‌کنید.
- مواردی که صریحاً «بررسی نشد» علامت خورده‌اند (فهرست تگ‌های sanitizer، فیلدهای قیمت تخفیف محصول، ماسک‌نبودن کامل revenue برای وضعیت‌های دقیق).
