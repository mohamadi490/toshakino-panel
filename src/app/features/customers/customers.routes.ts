import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/auth.guards';
import { Permissions } from '../../core/authorization/permissions';

export const CUSTOMERS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.CustomersRead] } },
    loadComponent: () => import('./customers-list.page').then((m) => m.CustomersListPage),
    title: 'مشتری‌ها | تشکینو',
  },
  {
    path: ':id',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.CustomersRead] } },
    loadComponent: () => import('./customer-detail.page').then((m) => m.CustomerDetailPage),
    title: 'پروفایل مشتری | تشکینو',
  },
];
