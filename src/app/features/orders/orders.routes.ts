import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/auth.guards';
import { Permissions } from '../../core/authorization/permissions';

export const ORDERS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.OrdersRead] } },
    loadComponent: () => import('./orders-list.page').then((m) => m.OrdersListPage),
    title: 'سفارش‌ها | تشکینو',
  },
  {
    path: ':id',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.OrdersRead] } },
    loadComponent: () => import('./order-detail.page').then((m) => m.OrderDetailPage),
    title: 'جزئیات سفارش | تشکینو',
  },
];
