/**
 * Persian messages keyed by the contract's stable error `code` (UI logic must use `code`,
 * never the English `detail`). Unknown codes fall back to a message chosen by HTTP kind.
 */
export const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  // 400
  cart_empty: 'سبد خرید خالی است.',
  invalid_cart_token: 'سبد خرید معتبر نیست.',
  invalid_current_password: 'رمز عبور فعلی نادرست است.',
  // 401
  unauthorized: 'برای ادامه باید وارد شوید.',
  invalid_token: 'نشست شما معتبر نیست. دوباره وارد شوید.',
  invalid_credentials: 'اطلاعات ورود صحیح نیست.',
  invalid_otp: 'کد تأیید نادرست است.',
  invalid_refresh_token: 'نشست شما منقضی شده است. دوباره وارد شوید.',
  // 403
  permission_denied: 'اجازه انجام این عملیات را ندارید.',
  account_disabled: 'حساب کاربری شما غیرفعال شده است.',
  forbidden: 'دسترسی به این بخش مجاز نیست.',
  // 404
  not_found: 'مورد درخواستی پیدا نشد.',
  product_not_found: 'محصول پیدا نشد.',
  variant_not_found: 'Variant پیدا نشد.',
  attribute_not_found: 'ویژگی پیدا نشد.',
  attribute_value_not_found: 'مقدار ویژگی پیدا نشد.',
  category_not_found: 'دسته‌بندی پیدا نشد.',
  brand_not_found: 'برند پیدا نشد.',
  order_not_found: 'سفارش پیدا نشد.',
  payment_not_found: 'پرداخت پیدا نشد.',
  shipping_method_not_found: 'روش ارسال پیدا نشد.',
  shipping_rule_not_found: 'قاعده ارسال پیدا نشد.',
  user_not_found: 'کاربر پیدا نشد.',
  role_not_found: 'نقش پیدا نشد.',
  province_not_found: 'استان پیدا نشد.',
  city_not_found: 'شهر پیدا نشد.',
  // 409
  insufficient_stock: 'موجودی کافی نیست.',
  product_unavailable: 'این محصول در دسترس نیست.',
  sku_taken: 'این SKU قبلاً استفاده شده است.',
  product_needs_variant: 'محصول باید حداقل یک Variant داشته باشد.',
  variant_option_required: 'برای این محصول انتخاب گزینه Variant الزامی است.',
  variant_option_duplicate: 'گزینه Variant تکراری است.',
  variant_attribute_mismatch: 'ویژگی Variant با ویژگی محصول یکی نیست.',
  attribute_name_taken: 'نام این ویژگی قبلاً استفاده شده است.',
  attribute_value_taken: 'این مقدار قبلاً برای ویژگی ثبت شده است.',
  attribute_in_use: 'این ویژگی در محصولات استفاده شده و حذف نمی‌شود.',
  attribute_value_in_use: 'این مقدار در Variantها استفاده شده و حذف نمی‌شود.',
  slug_taken: 'این اسلاگ قبلاً استفاده شده است.',
  category_name_taken: 'نام دسته‌بندی در این سطح تکراری است.',
  category_not_empty: 'دسته‌بندی محصول دارد و حذف نمی‌شود.',
  category_has_children: 'دسته‌بندی زیرمجموعه دارد و حذف نمی‌شود.',
  category_cycle: 'دسته‌بندی را نمی‌توان زیر خودش یا زیرمجموعه‌اش قرار داد.',
  category_too_deep: 'عمق درخت دسته‌بندی از حد مجاز بیشتر می‌شود.',
  parent_deleted: 'دسته‌بندی والد حذف شده است.',
  brand_name_taken: 'نام این برند قبلاً استفاده شده است.',
  brand_not_empty: 'برند محصول دارد و حذف نمی‌شود.',
  email_taken: 'این ایمیل قبلاً ثبت شده است.',
  username_taken: 'این نام کاربری قبلاً ثبت شده است.',
  mobile_taken: 'این موبایل قبلاً ثبت شده است.',
  role_name_taken: 'نام این نقش قبلاً استفاده شده است.',
  role_protected: 'نقش سیستمی قابل تغییر یا حذف نیست.',
  role_in_use: 'این نقش به کاربران اختصاص دارد و حذف نمی‌شود.',
  province_name_taken: 'نام این استان قبلاً ثبت شده است.',
  city_name_taken: 'نام این شهر در استان تکراری است.',
  cannot_modify_self: 'نمی‌توانید حساب خودتان را به این شکل تغییر دهید.',
  last_super_admin: 'آخرین مدیر کل را نمی‌توان غیرفعال یا تنزل داد.',
  order_not_cancellable: 'این سفارش دیگر قابل لغو نیست.',
  order_not_payable: 'این سفارش قابل پرداخت نیست.',
  rule_conflict: 'این قاعده با قاعده دیگری تداخل دارد.',
  invalid_status_transition: 'تغییر به این وضعیت برای سفارش مجاز نیست.',
  conflict: 'این عملیات با وضعیت فعلی داده‌ها تداخل دارد.',
  // 422
  validation_error: 'اطلاعات واردشده معتبر نیست.',
  unknown_permission: 'مجوز نامعتبر در درخواست وجود دارد.',
  invalid_city: 'شهر انتخاب‌شده معتبر نیست.',
  option_value_mismatch: 'مقدار گزینه با ویژگی انتخاب‌شده هم‌خوان نیست.',
  city_province_mismatch: 'شهر با استان انتخاب‌شده هم‌خوان نیست.',
  // 429 / 5xx
  rate_limited: 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.',
  internal_error: 'خطایی در سرور رخ داد. لطفاً بعداً تلاش کنید.',
  gateway_unavailable: 'درگاه در دسترس نیست. دوباره تلاش کنید.',
  sms_unavailable: 'سرویس پیامک در دسترس نیست.',
};

/** Conflict codes that belong to one form field although the API returns no `fieldErrors` for them. */
export const CODE_TO_FIELD: Readonly<Record<string, string>> = {
  slug_taken: 'slug',
  sku_taken: 'sku',
  email_taken: 'email',
  username_taken: 'username',
  mobile_taken: 'mobile',
  category_name_taken: 'name',
  brand_name_taken: 'name',
  role_name_taken: 'name',
  attribute_name_taken: 'name',
  attribute_value_taken: 'value',
  province_name_taken: 'name',
  city_name_taken: 'name',
};

/** Field-level `code` -> message. The backend's field `message` is English, so it is never shown. */
export const FIELD_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  required: 'این فیلد الزامی است.',
  missing: 'این فیلد الزامی است.',
  string_too_short: 'مقدار واردشده کوتاه‌تر از حد مجاز است.',
  string_too_long: 'مقدار واردشده بلندتر از حد مجاز است.',
  string_pattern_mismatch: 'قالب مقدار واردشده معتبر نیست.',
  greater_than_equal: 'مقدار واردشده کمتر از حد مجاز است.',
  less_than_equal: 'مقدار واردشده بیشتر از حد مجاز است.',
  int_parsing: 'یک عدد صحیح وارد کنید.',
};

export const GENERIC_FIELD_MESSAGE = 'مقدار واردشده معتبر نیست.';
