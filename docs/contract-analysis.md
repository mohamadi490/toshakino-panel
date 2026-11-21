# تحلیل قرارداد بک‌اند و اثر آن بر پنل

مبنا: `docs/contracts/openapi.json` (۸۴ مسیر، ۱۸۱ schema) و `docs/contracts/backend-frontend-guide.md`.
تا اینجا چند ماژول بر اساس **فرض** ساخته شده بود (چون OpenAPI نبود). جدول زیر فرض‌ها را با قرارداد مقایسه می‌کند.

## ۱) اختلاف‌های سراسری (لایه Core)

| موضوع | فرض قبلی | قرارداد | اقدام |
|---|---|---|---|
| واحد پول | ریال صحیح، نمایش تومان = ÷۱۰ | **عدد صحیح تومان** (`price`، `totalAmount`، ...) | حذف تبدیل ریال/تومان؛ `formatMoney(toman)`؛ فیلدها `priceRial` → `price` |
| شناسه | رشته | **عدد صحیح** | مدل‌ها `number`؛ پارامتر روت رشته است و موقع فراخوانی تبدیل می‌شود |
| صفحه‌بندی | `meta{page,...}` | `pagination{page,pageSize,totalItems,totalPages}` | `ApiPage`، `PagedList` |
| خطای فیلد | `fieldErrors: {field:[msg]}` | `fieldErrors: [{field, code, message}]` | تبدیل به نقشه؛ پیام فارسی از روی `code` |
| پیام خطا | `detail` به کاربر نشان داده می‌شد | `detail` انگلیسی و برای لاگ است؛ **منطق UI روی `code`** | جدول `code → پیام فارسی` + پیام عمومی برای کد ناشناخته؛ `traceId` در خطاهای ۵xx |
| ورود ادمین | `POST /auth/admin/login` | `POST /admin/auth/login` `{identifier,password}`؛ `/admin/auth/refresh`، `/admin/auth/logout` | اصلاح `AuthService` |
| اطلاعات کاربر | `/auth/me` با `roles[]` | `/auth/me` ← `{id,email,username,mobile,fullName,role:{id,name,isStaff},permissions[]}` (**یک نقش**) | مدل `CurrentUser` |
| هدر CSRF | `X-Requested-With` روی refresh/login | CORS فقط `Authorization, Content-Type, Idempotency-Key, X-Request-Id` را مجاز می‌داند ← **این هدر preflight را رد می‌کند** | حذف هدر؛ سؤال باز درباره محافظت CSRF (Q2) |
| `Idempotency-Key` | روی تعدیل موجودی و تغییر وضعیت سفارش | فقط روی `POST /orders` مشتری | حذف از پنل ادمین |
| پاسخ‌های `/admin/*` | — | همیشه `private, no-store` | بدون کش سمت کلاینت |
| `X-Request-Id` | — | اگر فرستاده شود همان به `traceId` تبدیل می‌شود | interceptor ارسال شناسه درخواست؛ نمایش `traceId` برای پشتیبانی |
| تاریخ | ISO UTC | ISO UTC؛ بعضی فیلدها فقط `date` (`series[].date`) | بدون تغییر؛ formatter برای date-only |

## ۲) ماژول‌های ساخته‌شده و وضعیت آن‌ها در برابر قرارداد

| ماژول فعلی | وضعیت | نتیجه |
|---|---|---|
| احراز هویت و RBAC | ناسازگار (مسیرها، مدل کاربر، CSRF) | بازنویسی هسته Auth |
| کاربران و نقش‌ها | مدل متفاوت | بازنویسی: یک نقش، `fullName`، بدون ویرایش ایمیل/موبایل، `newPassword`، نقش `isStaff`، حذف نقش، کاتالوگ مجوز بدون گروه (گروه‌بندی با پیشوند کد) |
| دسته‌بندی‌ها | ناسازگار | `name/position/status(draft\|published)`، `imageUrl/imageAlt`، حذف نرم + بازیابی، `GET by id`، خطاهای `category_*`، بدون `productCount` |
| محصولات | ناسازگار | **یک ویژگی (attribute) برای هر محصول** و هر Variant یک `option{attributeId,valueId}`؛ `specs` یک آبجکت؛ `images[{url,alt}]`؛ `brandId`، `guarantee`، `subtitle`؛ انتشار با `PATCH status`؛ حذف نرم + بازیابی؛ Variant با endpoint جدا؛ قیمت‌ها تومان |
| موجودی انبار | **endpoint ندارد** | موجودی روی Variant است (`stock`، تنظیم مطلق با `PATCH`)؛ تاریخچه/دلیل/Idempotency وجود ندارد. بازطراحی بر پایه محصولات + تنظیم نمایش موجودی (Q6) |
| سفارش‌ها | ناسازگار | فقط فهرست + تغییر وضعیت؛ **بدون جزئیات، بدون جستجو/مرتب‌سازی/تاریخ**؛ پاسخ شامل اقلام، تاریخچه و آدرس snapshot است؛ بدون `allowedTransitions` (سرور با `invalid_status_transition` رد می‌کند)؛ پرداخت‌ها در API ادمین نیست (Q3, Q4) |
| مشتری‌ها | **endpoint ندارد** | `/admin/customers` وجود ندارد. مشتری = کاربر با نقش غیرکارمند در `/admin/users` (Q5)؛ تعداد مشتری در داشبورد هست. ماژول جدا حذف می‌شود |
| داشبورد | ناسازگار | `GET /admin/dashboard?days=` (۱ تا ۳۶۵) با `sales`، `today`، `ordersByStatus`، `awaitingShipment`، `customers`، `catalog`، `series`، `topProducts`، `recentOrders` |

## ۳) ماژول‌های جدید که قرارداد دارد

| ماژول | endpoint ها | فاز |
|---|---|---|
| برندها | `/admin/brands` (+ restore) | ۱ |
| ویژگی‌ها | `/admin/attributes` (+ values) | ۱ |
| کتابخانه رسانه | `/admin/media` (آپلود `multipart` با فیلد `file`، فهرست، حذف) | ۱ |
| تنظیمات فروشگاه | `/admin/settings/site`، `/admin/settings/home`، `/admin/settings/stock-display` | ۱ |
| روش‌ها و قواعد ارسال | `/admin/shipping/methods` (+ `/rules`) | ۲ |
| استان و شهر | `/admin/provinces`، `/admin/cities` | ۲ |
| صفحات محتوا | `/admin/pages` | ۲ |
| سیستم و outbox | `/admin/system`، `/admin/outbox`، `/admin/orders/expire-unpaid` | ۲ |

## ۴) تصمیم‌های معماری
1. **تایپ از OpenAPI، کلاینت دست‌نویس**: `openapi-typescript` فقط تایپ می‌سازد؛ `ApiClient` و interceptor ها همان معماری قبلی را حفظ می‌کنند. هر تغییر قرارداد در کامپایل دیده می‌شود. (ng-openapi-gen سرویس‌های Angular می‌سازد ولی با تک‌منبع‌بودن envelope/خطا/auth ما همپوشانی دارد.)
2. **فرض نمی‌کنیم**: هرجا قرارداد ساکت است (مجوزها، انتقال وضعیت، PATCH null) در `docs/open-questions.md` ثبت و **تا پاسخ، محافظه‌کارانه** رفتار می‌شود.
3. **منطق UI روی `code`**: پیام‌های فارسی در `core/api/error-messages.ts`.
4. **حذف نرم**: فهرست‌هایی که `deleted` دارند یک تب/فیلتر «حذف‌شده‌ها» با دکمه بازیابی دارند.
5. هر ماژول یک فایل `docs/modules/<module>.md` دارد (قرارداد مصرف‌شده، مجوزها، وضعیت‌ها، تست‌ها).

## ۵) راستی‌آزمایی تحلیل با پاسخ بک‌اند (`docs/contracts/backend-answers.md`)

نتیجه: همه ردیف‌های بخش ۱ و ۲ تأیید شد. این موارد **اصلاح یا اضافه** می‌شوند:

| # | اصلاح / نکته | اثر |
|---|---|---|
| ۱ | `pagination` فقط روی فهرست‌های صفحه‌بندی‌شده است. **بدون صفحه‌بندی (آرایه ساده در `data`)**: نقش‌ها، برندها، دسته‌ها، ویژگی‌ها، روش‌های ارسال، استان‌ها/شهرها، صفحات | این صفحه‌ها `ApiClient.get<T[]>` می‌خوانند، نه `getPage` |
| ۲ | **کد مجوزها یکدست نیست** (مثلاً `orders.update`، `categories.write` برای دسته و برند، `media.write` فقط برای رسانه، `content.*` برای تنظیمات سایت/صفحه اصلی و `settings.*` فقط برای نمایش موجودی) | رجیستری مجوزها بازنویسی شد؛ جدول در `docs/modules/core.md` |
| ۳ | `categories.read` و `media.read` وجود ندارد؛ **خواندن** هم `categories.write`/`media.write` می‌خواهد | منوی دسته/برند/رسانه با مجوز نوشتن کنترل می‌شود |
| ۴ | ویژگی‌ها زیر `products.read/write` هستند | — |
| ۵ | `series[].date` روز تقویمی **Asia/Tehran** است (نه UTC) | بدون تبدیل منطقه زمانی در نمودار |
| ۶ | `shipping` در سفارش ممکن است `null` باشد (سفارش‌های قدیمی) | مدل nullable |
| ۷ | نقش پیش‌فرض `admin` همه منوها را **ندارد** (بدون `roles.*`، `users.write`، `outbox.*`، `system.read`) و مجوزهای جدید خودکار به نقش‌های موجود داده نمی‌شود | UI نباید فرض کند همه چیز در دسترس است؛ منو بر اساس `permissions` ساخته می‌شود |
| ۸ | ماژول `customers` ریپوی بک‌اند مربوط به API مشتری (storefront) است، نه پنل | تأیید حذف ماژول مشتری |
| ۹ | حذف نرم (`deleted`) روی دسته، برند، محصول و Variant هست | تب «حذف‌شده‌ها» |
| ۱۰ | اسلاگ قدیمی تا وقتی مالک دارد قابل استفاده برای دیگری نیست؛ یکتایی فقط بین موارد زنده | هشدار تغییر اسلاگ |
| ۱۱ | حذف دسته: `category_not_empty` (محصول زنده) و `category_has_children` دو پیام جدا | پیام جدا |
| ۱۲ | **یافته ما:** در قرارداد هیچ «رنگ برند» نیست (تنظیمات سایت فقط نام، شعار، لوگو، favicon، تماس، شبکه‌های اجتماعی، متن پاورقی و سئو دارد) | `BrandService` و endpoint خیالی `/admin/brand/admin` حذف شد؛ پالت پنل ثابت است |
| ۱۳ | مبلغ‌های محصول (قیمت قبل از تخفیف) در این فایل بررسی نشده؛ باید از schema `ProductAdminRead` خوانده شود | B4 از OpenAPI |
