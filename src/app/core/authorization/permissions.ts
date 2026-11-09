/**
 * Single source of truth for permission keys (must stay aligned with the backend
 * Permission Registry). Use `Permissions.X` everywhere - never repeat raw strings.
 */
export const Permissions = {
  UsersRead: 'users.read',
  UsersCreate: 'users.create',
  UsersUpdate: 'users.update',
  UsersDisable: 'users.disable',
  RolesRead: 'roles.read',
  RolesCreate: 'roles.create',
  RolesUpdate: 'roles.update',
  RolesAssign: 'roles.assign',
  ProductsRead: 'products.read',
  ProductsCreate: 'products.create',
  ProductsUpdate: 'products.update',
  ProductsPublish: 'products.publish',
  CategoriesRead: 'categories.read',
  CategoriesManage: 'categories.manage',
  InventoryRead: 'inventory.read',
  InventoryAdjust: 'inventory.adjust',
  OrdersRead: 'orders.read',
  OrdersUpdateStatus: 'orders.update_status',
  OrdersCancel: 'orders.cancel',
  CustomersRead: 'customers.read',
  CustomersUpdate: 'customers.update',
  ContentRead: 'content.read',
  ContentCreate: 'content.create',
  ContentUpdate: 'content.update',
  ContentPublish: 'content.publish',
  BrandSiteRead: 'brand.site.read',
  BrandSiteUpdate: 'brand.site.update',
  BrandAdminRead: 'brand.admin.read',
  BrandAdminUpdate: 'brand.admin.update',
  PaymentsRead: 'payments.read',
  PaymentsRefund: 'payments.refund',
  ReportsRead: 'reports.read',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

/** Route/menu requirement: user needs ALL of `all` and at least one of `any` (when given). */
export interface PermissionRequirement {
  all?: readonly Permission[];
  any?: readonly Permission[];
}
