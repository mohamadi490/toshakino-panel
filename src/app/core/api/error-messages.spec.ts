import { CODE_TO_FIELD, ERROR_MESSAGES } from './error-messages';

/**
 * Every request-level error code the backend documents (docs/contracts/backend-answers.md,
 * appendix B). The UI must show a Persian message for each - never the English `detail`.
 */
const DOCUMENTED = [
  'validation_error',
  'invalid_credentials',
  'invalid_token',
  'invalid_refresh_token',
  'account_disabled',
  'permission_denied',
  'forbidden',
  'rate_limited',
  'conflict',
  'internal_error',
  'gateway_unavailable',
  'sms_unavailable',
  'invalid_otp',
  'invalid_current_password',
  'user_not_found',
  'cannot_modify_self',
  'last_super_admin',
  'role_not_found',
  'role_name_taken',
  'role_protected',
  'role_in_use',
  'unknown_permission',
  'category_not_found',
  'category_name_taken',
  'category_cycle',
  'category_has_children',
  'category_not_empty',
  'category_too_deep',
  'parent_deleted',
  'brand_not_found',
  'brand_name_taken',
  'brand_not_empty',
  'slug_taken',
  'product_not_found',
  'product_unavailable',
  'product_needs_variant',
  'variant_not_found',
  'sku_taken',
  'variant_option_required',
  'variant_option_duplicate',
  'variant_attribute_mismatch',
  'option_value_mismatch',
  'attribute_not_found',
  'attribute_name_taken',
  'attribute_in_use',
  'attribute_value_not_found',
  'attribute_value_taken',
  'attribute_value_in_use',
  'order_not_found',
  'invalid_status_transition',
  'order_not_cancellable',
  'order_not_payable',
  'payment_not_found',
  'insufficient_stock',
  'cart_empty',
  'cart_conflict',
  'cart_item_not_found',
  'invalid_cart_token',
  'idempotency_key_reused',
  'province_not_found',
  'province_name_taken',
  'city_not_found',
  'city_name_taken',
  'city_province_mismatch',
  'invalid_city',
  'shipping_method_not_found',
  'shipping_rule_not_found',
  'rule_conflict',
  'shipping_unavailable',
  'address_not_found',
  'address_limit_reached',
  'media_not_found',
  'media_empty',
  'media_too_large',
  'media_unsupported_type',
  'page_not_found',
  'page_slug_taken',
  'outbox_event_not_found',
  'outbox_event_not_failed',
];

describe('error messages', () => {
  it('covers the documented codes (guards against list drift)', () => {
    expect(DOCUMENTED.length).toBe(79);
    expect(new Set(DOCUMENTED).size).toBe(DOCUMENTED.length);
  });
  it.each(DOCUMENTED)('has a Persian message for %s', (code) => {
    expect(ERROR_MESSAGES[code], code).toBeTruthy();
    expect(ERROR_MESSAGES[code]).toMatch(/[\u0600-\u06FF]/);
  });
  it('only maps conflict codes to fields that have a message', () => {
    for (const code of Object.keys(CODE_TO_FIELD)) expect(ERROR_MESSAGES[code], code).toBeTruthy();
  });
});
