# نقشه راه توسعه (بر مبنای قرارداد OpenAPI)

اصول: هر ماژول یک **برنچ** (`feature/<name>`) و یک **PR**؛ CI سبز (lint، typecheck، cycles، تست، build، `api:check`)؛ تست واحد/یکپارچه؛ مستند ماژول در `docs/modules/<module>.md`؛ پایان هر PR فقط با ابهام‌های ثبت‌شده در `docs/open-questions.md`.

## مرحله A - هم‌ترازی هسته با قرارداد (پیش‌نیاز همه)
| PR | شاخه | محتوا | معیار پذیرش |
|---|---|---|---|
| A0 | `docs/contracts-and-roadmap` | قراردادها در ریپو، تایپ تولیدشده، اسکریپت‌های `api:generate/check`، تحلیل، نقشه راه، سؤال‌های باز | `api:check` سبز؛ مستندات |
| A1 | `feature/contract-core` | `pagination`، `ProblemDetails` جدید + پیام فارسی از `code`، تومان، شناسه عددی، مسیرهای `/admin/auth/*`، حذف هدر CSRF، `X-Request-Id`، مدل `/auth/me` | همه تست‌های هسته بازنویسی و سبز؛ سند `core.md` |

## مرحله B - فاز ۱ (MVP عملیاتی)
| PR | شاخه | ماژول | نکات |
|---|---|---|---|
| B1 | `feature/access-control-v2` | کاربران، نقش‌ها، مجوزها | یک نقش؛ `isStaff`؛ حذف نقش؛ `newPassword`؛ محافظت `role_protected`, `cannot_modify_self`, `last_super_admin` |
| B2 | `feature/catalog-taxonomy` | دسته‌بندی‌ها، برندها، ویژگی‌ها | فهرست‌ها بدون صفحه‌بندی؛ منو/روت دسته و برند با `categories.write` (خواندن هم همین)؛ ویژگی‌ها `products.read/write`؛ slug اختیاری (خودکار از نام) با هشدار تغییر؛ حذف نرم/بازیابی؛ پیام جدا برای `category_not_empty` و `category_has_children` |
| B3 | `feature/media-library` | کتابخانه رسانه + انتخابگر تصویر | مجوز `media.write` (فهرست هم)؛ ۵MB و فقط JPEG/PNG/GIF/WebP (بررسی کلاینت صرفاً راهنما)؛ هشدار قبل از حذف (فایل در‌حال‌استفاده رد نمی‌شود)؛ بدون ویرایش alt |
| B4 | `feature/products-v2` | محصولات + Variantها | ویژگی واحد، `option`، `specs`، تصاویر، برند، قیمت تخفیفی `compareAtPrice`، انتشار با `status`، حذف نرم |
| B5 | `feature/orders-v2` | سفارش‌ها | فهرست + پنل جزئیات (اقلام، آدرس nullable، تاریخچه)؛ جدول انتقال تأییدشده (`pending_payment→cancelled`، `paid→shipped/cancelled`، `shipped→delivered`؛ ادمین `paid` نمی‌زند)؛ `orders.update`؛ `expire-unpaid` |
| B6 | `feature/dashboard-v2` | داشبورد | `days` (۱ تا ۳۶۵)؛ `dashboard.read`؛ تاریخ سری date-only (منطقه Asia/Tehran، بدون تبدیل)؛ KPIها، پرفروش‌ها، سفارش‌های اخیر |
| B7 | `feature/inventory-v2` | موجودی | بر پایه Variantها + تنظیم نمایش موجودی؛ (محدودیت‌های Q6 مستند) |
| B8 | `feature/store-settings` | تنظیمات سایت، صفحه اصلی (بنر/محصولات ویژه)، نمایش موجودی | سایت/صفحه اصلی: `content.read/write` و `PUT` با فقط فیلدهای ارسالی؛ نمایش موجودی: `settings.read/write`؛ اعتبارسنجی URL؛ انتخابگر رسانه |

حذف: ماژول `customers` (endpoint ندارد؛ Q5) در PR مربوط به B1 با مستندسازی.

## مرحله C - فاز ۲
| PR | شاخه | ماژول |
|---|---|---|
| C1 | `feature/shipping` | روش‌ها و قواعد ارسال (استان/شهر/وزن/رایگان بالای مبلغ) |
| C2 | `feature/geography` | استان‌ها و شهرها |
| C3 | `feature/cms-pages` | صفحات محتوا |
| C4 | `feature/system-health` | سلامت سیستم، outbox (نمایش، retry)، لغو سفارش‌های پرداخت‌نشده |

## مرحله D - کیفیت و تحویل
- E2E (Playwright) روی سناریوهای ورود، ایجاد محصول، تغییر وضعیت سفارش؛ نیازمند API/مرورگر در CI.
- بازبینی دسترس‌پذیری و RTL روی مرورگر واقعی؛ بهینه‌سازی bundle؛ مستند استقرار.

## قواعد تست هر ماژول
حالت‌های بارگذاری، خالی، خطا (با `code` واقعی قرارداد)، ممنوع (۴۰۳)، موفق؛ ارسال payload دقیقاً مطابق schema؛ نگاشت `fieldErrors`؛ قفل دوباره‌ارسال؛ اعتبارسنجی مرز مقادیر (min/max/pattern در OpenAPI).
