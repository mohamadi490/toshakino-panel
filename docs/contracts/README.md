# قراردادهای بک‌اند

| فایل | توضیح |
|---|---|
| `openapi.json` | قرارداد رسمی API (OpenAPI 3.1، نسخه `0.1.0`). **مرجع نهایی** برای مسیرها، بدنه‌ها و پاسخ‌ها |
| `backend-frontend-guide.md` | راهنمای تیم بک‌اند برای مصرف API (قواعد مشترک: قالب داده، خطا، auth، کش) |
| `backend-answers.md` | **پاسخ بک‌اند به سؤال‌های باز و راستی‌آزمایی تحلیل** (از روی کد واقعی `toshakino-api`)؛ شامل جدول endpoint ← مجوز و فهرست کامل کدهای خطا |

## قاعده‌ها
1. هر جا بین فرض‌های ما و این دو فایل اختلاف بود، **قرارداد درست است** و کد اصلاح می‌شود.
2. تایپ‌های TypeScript از `openapi.json` تولید می‌شوند: `src/app/core/api/generated/api.d.ts` (دستی ویرایش نشود).
3. نامی که در `core/api/schemas.ts` export می‌شود تنها راه رسمی مصرف تایپ‌هاست؛ feature ها مستقیم از فایل تولیدشده import نمی‌کنند.

## به‌روزرسانی قرارداد
```bash
cp <فایل جدید> docs/contracts/openapi.json
npm run api:generate     # تایپ‌ها دوباره ساخته می‌شود
npm run verify           # کامپایلر هر ناسازگاری را نشان می‌دهد
npm run api:check        # (CI هم اجرا می‌کند) تایپ‌های commit شده با قرارداد یکی باشند
```
در PR، فایل قرارداد و تایپ‌های تولیدشده باید **با هم** commit شوند و تغییر رفتاری در `docs/contract-analysis.md` ثبت شود.

## چیزهایی که OpenAPI نمی‌گوید
کد مجوزها، انتقال‌های مجاز وضعیت سفارش و فهرست `code` خطاها در OpenAPI نیست؛ پاسخ رسمی‌اش در `backend-answers.md` است و در کد اعمال شده است (`core/authorization/permissions.ts`، `core/api/error-messages.ts`). موارد باز و بک‌لاگ بک‌اند: `docs/open-questions.md`.
