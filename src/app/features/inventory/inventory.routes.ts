import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/auth.guards';
import { Permissions } from '../../core/authorization/permissions';

export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.InventoryRead] } },
    loadComponent: () => import('./inventory-list.page').then((m) => m.InventoryListPage),
    title: 'موجودی انبار | تشکینو',
  },
];
