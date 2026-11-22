import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/auth.guards';
import { Permissions } from '../../core/authorization/permissions';

/** Categories and brands share `categories.write` for reading AND writing (no `categories.read` exists). */
const categoriesPolicy = { all: [Permissions.CategoriesWrite] } as const;

export const CATEGORY_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: categoriesPolicy },
    loadComponent: () => import('./categories-list.page').then((m) => m.CategoriesListPage),
    title: 'دسته‌بندی‌ها | تشکینو',
  },
  {
    path: 'new',
    canActivate: [permissionGuard],
    data: { permissions: categoriesPolicy },
    loadComponent: () => import('./category-form.page').then((m) => m.CategoryFormPage),
    title: 'دسته‌بندی جدید | تشکینو',
  },
  {
    path: ':id',
    canActivate: [permissionGuard],
    data: { permissions: categoriesPolicy },
    loadComponent: () => import('./category-form.page').then((m) => m.CategoryFormPage),
    title: 'ویرایش دسته‌بندی | تشکینو',
  },
];

export const BRAND_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: categoriesPolicy },
    loadComponent: () => import('./brands-list.page').then((m) => m.BrandsListPage),
    title: 'برندها | تشکینو',
  },
  {
    path: 'new',
    canActivate: [permissionGuard],
    data: { permissions: categoriesPolicy },
    loadComponent: () => import('./brand-form.page').then((m) => m.BrandFormPage),
    title: 'برند جدید | تشکینو',
  },
  {
    path: ':id',
    canActivate: [permissionGuard],
    data: { permissions: categoriesPolicy },
    loadComponent: () => import('./brand-form.page').then((m) => m.BrandFormPage),
    title: 'ویرایش برند | تشکینو',
  },
];

/** Attributes live under products: `products.read` to view, `products.write` to change. */
export const ATTRIBUTE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.ProductsRead] } },
    loadComponent: () => import('./attributes-list.page').then((m) => m.AttributesListPage),
    title: 'ویژگی‌ها | تشکینو',
  },
  {
    path: 'new',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.ProductsWrite] } },
    loadComponent: () => import('./attribute-form.page').then((m) => m.AttributeFormPage),
    title: 'ویژگی جدید | تشکینو',
  },
  {
    path: ':id',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.ProductsRead] } },
    loadComponent: () => import('./attribute-form.page').then((m) => m.AttributeFormPage),
    title: 'ویرایش ویژگی | تشکینو',
  },
];
