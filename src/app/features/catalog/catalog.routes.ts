import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/auth.guards';
import { Permissions } from '../../core/authorization/permissions';

export const CATALOG_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'categories' },
  {
    path: 'categories',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.CategoriesRead] } },
    loadComponent: () => import('./categories-list.page').then((m) => m.CategoriesListPage),
    title: 'دسته‌بندی‌ها | تشکینو',
  },
  {
    path: 'categories/new',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.CategoriesManage] } },
    loadComponent: () => import('./category-form.page').then((m) => m.CategoryFormPage),
    title: 'دسته‌بندی جدید | تشکینو',
  },
  {
    path: 'categories/:id',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.CategoriesRead] } },
    loadComponent: () => import('./category-form.page').then((m) => m.CategoryFormPage),
    title: 'ویرایش دسته‌بندی | تشکینو',
  },
];
