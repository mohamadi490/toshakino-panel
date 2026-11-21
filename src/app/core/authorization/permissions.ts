/**
 * Permission codes exactly as registered by the backend (identity/permissions.py), confirmed in
 * docs/contracts/backend-answers.md (Q1 + appendix A). The live list is `GET /admin/permissions`;
 * `super_admin` always has all of them. Use `Permissions.X` everywhere - never repeat raw strings.
 *
 * NOTE the names are NOT uniform `<resource>.<action>`: orders use `orders.update`, categories AND
 * brands use `categories.write` (there is no `categories.read`), media only has `media.write`
 * (it also covers listing), site/home settings use `content.*`, stock-display uses `settings.*`.
 */
export const Permissions = {
  ProductsRead: 'products.read',
  ProductsWrite: 'products.write',
  CategoriesWrite: 'categories.write',
  OrdersRead: 'orders.read',
  OrdersUpdate: 'orders.update',
  UsersRead: 'users.read',
  UsersWrite: 'users.write',
  RolesRead: 'roles.read',
  RolesWrite: 'roles.write',
  OutboxRead: 'outbox.read',
  OutboxWrite: 'outbox.write',
  ShippingRead: 'shipping.read',
  ShippingWrite: 'shipping.write',
  SettingsRead: 'settings.read',
  SettingsWrite: 'settings.write',
  ContentRead: 'content.read',
  ContentWrite: 'content.write',
  MediaWrite: 'media.write',
  DashboardRead: 'dashboard.read',
  SystemRead: 'system.read',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

/** Route/menu requirement: user needs ALL of `all` and at least one of `any` (when given). */
export interface PermissionRequirement {
  all?: readonly Permission[];
  any?: readonly Permission[];
}
