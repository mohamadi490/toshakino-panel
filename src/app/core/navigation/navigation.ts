import { Injectable, computed, inject } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { PermissionRequirement, Permissions } from '../authorization/permissions';

export interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: string; // key in shared icon set
  permissions?: PermissionRequirement; // undefined => any authenticated admin
}

/**
 * Menu registry. Only IMPLEMENTED routes are listed (a menu item without a
 * guarded route is a bug). Each feature phase appends its entries here.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'داشبورد', route: '/dashboard', icon: 'home' },
  {
    id: 'orders',
    label: 'سفارش‌ها',
    route: '/orders',
    icon: 'receipt',
    permissions: { all: [Permissions.OrdersRead] },
  },
  {
    id: 'customers',
    label: 'مشتری‌ها',
    route: '/customers',
    icon: 'user',
    permissions: { all: [Permissions.CustomersRead] },
  },
  {
    id: 'products',
    label: 'محصولات',
    route: '/catalog/products',
    icon: 'box',
    permissions: { all: [Permissions.ProductsRead] },
  },
  {
    id: 'categories',
    label: 'دسته‌بندی‌ها',
    route: '/catalog/categories',
    icon: 'folder',
    permissions: { all: [Permissions.CategoriesRead] },
  },
  {
    id: 'inventory',
    label: 'موجودی انبار',
    route: '/inventory',
    icon: 'stack',
    permissions: { all: [Permissions.InventoryRead] },
  },
  {
    id: 'users',
    label: 'کاربران پنل',
    route: '/access/users',
    icon: 'users',
    permissions: { all: [Permissions.UsersRead] },
  },
  {
    id: 'roles',
    label: 'نقش‌ها و مجوزها',
    route: '/access/roles',
    icon: 'shield',
    permissions: { all: [Permissions.RolesRead] },
  },
];

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly store = inject(AuthStore);
  readonly items = computed(() => NAV_ITEMS.filter((i) => this.store.can(i.permissions)));
}
