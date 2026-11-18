# ماژول کاربران و نقش‌ها (`features/access-control`)

## هدف
مدیریت حساب‌ها (کارمند و مشتری)، نقش‌ها و کاتالوگ مجوزها. مرجع: OpenAPI (`adminListUsers`, `adminCreateUser`, `adminGetUser`, `adminUpdateUser`, `adminListRoles`, `adminCreateRole`, `adminUpdateRole`, `adminDeleteRole`, `adminListPermissions`).

## قرارداد مصرف‌شده
| عمل | endpoint | نکته |
|---|---|---|
| فهرست کاربران | `GET /admin/users?q&roleId&isActive&page&pageSize` | `{data[], pagination}` |
| ایجاد | `POST /admin/users` `{email?,username?,mobile?,password,fullName?,roleId}` | الگوها از قرارداد: ایمیل، نام کاربری `^[a-z0-9][a-z0-9._-]{2,49}$`، رمز ۸ تا ۱۲۸ |
| جزئیات | `GET /admin/users/{id}` | شامل `role` و `permissions` مؤثر |
| ویرایش | `PATCH /admin/users/{id}` `{fullName?,roleId?,isActive?,newPassword?}` | ایمیل/موبایل/نام کاربری **قابل ویرایش نیست** (Q7) |
| نقش‌ها | `GET/POST /admin/roles`, `PATCH/DELETE /admin/roles/{id}` | فهرست **بدون صفحه‌بندی**؛ `GET` تکی ندارد (Q17) |
| کاتالوگ مجوز | `GET /admin/permissions` → `[{code, description}]` | گروه‌بندی سمت UI با پیشوند کد (`orders.read` → `orders`) |

## صفحه‌ها
`/access/users` (فهرست)، `/access/users/new`، `/access/users/:id`، `/access/roles`، `/access/roles/new`، `/access/roles/:id`.

## رفتار و قواعد
- **یک نقش برای هر کاربر**؛ نشان «کارمند/مشتری» از `role.isStaff`. «مشتری» همان کاربر با نقش غیرکارمند است (ماژول مشتری جدا نداریم، Q5).
- ایجاد: حداقل یکی از ایمیل/نام کاربری/موبایل؛ موبایل با ارقام فارسی هم پذیرفته و به ASCII تبدیل می‌شود؛ فیلدهای خالی ارسال نمی‌شوند.
- ویرایش: فقط **فیلدهای تغییرکرده** ارسال می‌شود؛ پاک‌کردن نام = `null` صریح (Q12)؛ بدون تغییر = بدون درخواست.
- **حفاظت خود**: نقش و وضعیت حساب جاری قابل تغییر نیست (UX). خودِ سرور با `cannot_modify_self` و `last_super_admin` تصمیم می‌گیرد.
- نقش‌ها: ویرایش با diff؛ نقش سیستمی (`isSystem`) فقط هشدار می‌دهد و حذف آن پنهان است؛ `role_protected` و `role_in_use` از سرور با پیام فارسی نمایش داده می‌شود.
- قفل ارسال دوباره، نگاشت `fieldErrors[]` و کدهای تداخل (`email_taken` → فیلد ایمیل، `role_name_taken` → نام).

## مجوزها
`users.read/create/update`، `roles.read/create/update/delete` (نام‌ها **حدسی** تا پاسخ Q1). بدون `roles.read`: انتخاب نقش ممکن نیست (پیام) و فیلتر نقش مخفی است؛ نقش فعلی کاربر همچنان دیده می‌شود.

## سؤال‌های باز مرتبط
Q1 (کد مجوزها و مجوز حذف نقش)، Q7، Q12، Q17.

## تست‌ها (۴۱ تست)
فهرست (پارامترها، نشان‌ها، فیلترها، مخفی‌سازی بر اساس مجوز، تأیید قبل از غیرفعال‌سازی، پیام `last_super_admin`، خطا و تلاش دوباره)؛ فرم کاربر (payload دقیق، الگوها، اعتبار رمز، نقش اجباری، قفل ارسال، `email_taken`/`fieldErrors`، حالت ویرایش diff، `null` صریح، حفاظت خود، فقط‌خواندنی)؛ فهرست نقش (حذف با تأیید و 204، `role_in_use`)؛ فرم نقش (گروه‌بندی، مرتب‌سازی مجوزها، diff، `role_protected`، فقط‌خواندنی، پیدا نشد).
