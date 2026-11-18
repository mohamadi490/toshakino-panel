import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/auth.guards';
import { Permissions } from '../../core/authorization/permissions';

export const ACCESS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  {
    path: 'users',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.UsersRead] } },
    loadComponent: () => import('./users-list.page').then((m) => m.UsersListPage),
    title: 'کاربران | تشکینو',
  },
  {
    path: 'users/new',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.UsersCreate] } },
    loadComponent: () => import('./user-form.page').then((m) => m.UserFormPage),
    title: 'کاربر جدید | تشکینو',
  },
  {
    path: 'users/:id',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.UsersRead] } },
    loadComponent: () => import('./user-form.page').then((m) => m.UserFormPage),
    title: 'ویرایش کاربر | تشکینو',
  },
  {
    path: 'roles',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.RolesRead] } },
    loadComponent: () => import('./roles-list.page').then((m) => m.RolesListPage),
    title: 'نقش‌ها | تشکینو',
  },
  {
    path: 'roles/new',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.RolesCreate] } },
    loadComponent: () => import('./role-form.page').then((m) => m.RoleFormPage),
    title: 'نقش جدید | تشکینو',
  },
  {
    path: 'roles/:id',
    canActivate: [permissionGuard],
    data: { permissions: { all: [Permissions.RolesRead] } },
    loadComponent: () => import('./role-form.page').then((m) => m.RoleFormPage),
    title: 'ویرایش نقش | تشکینو',
  },
];
