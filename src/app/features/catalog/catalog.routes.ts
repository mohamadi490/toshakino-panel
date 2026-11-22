import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/auth.guards';
import { Permissions } from '../../core/authorization/permissions';

export const CATALOG_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'products' },
  {
    path: 'products',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.ProductsRead] } },
    loadComponent: () => import('./products-list.page').then((m) => m.ProductsListPage),
    title: 'محصولات | تشکینو',
  },
  {
    path: 'products/new',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.ProductsWrite] } },
    loadComponent: () => import('./product-form.page').then((m) => m.ProductFormPage),
    title: 'محصول جدید | تشکینو',
  },
  {
    path: 'products/:id',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.ProductsRead] } },
    loadComponent: () => import('./product-form.page').then((m) => m.ProductFormPage),
    title: 'ویرایش محصول | تشکینو',
  },
];
