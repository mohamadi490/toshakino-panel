import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
        title: 'ورود | تشکینو',
      },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/admin-shell/admin-shell').then((m) => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        // Any authenticated admin may open the dashboard; widgets are permission-gated later.
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
        title: 'داشبورد | تشکینو',
      },
      {
        path: 'catalog',
        loadChildren: () =>
          import('./features/catalog/catalog.routes').then((m) => m.CATALOG_ROUTES),
      },
      {
        path: 'inventory',
        loadChildren: () =>
          import('./features/inventory/inventory.routes').then((m) => m.INVENTORY_ROUTES),
      },
      {
        path: 'access',
        loadChildren: () =>
          import('./features/access-control/access.routes').then((m) => m.ACCESS_ROUTES),
      },
      {
        path: 'forbidden',
        loadComponent: () =>
          import('./features/errors/forbidden.page').then((m) => m.ForbiddenPage),
        title: 'دسترسی غیرمجاز | تشکینو',
      },
      {
        path: '**',
        loadComponent: () => import('./features/errors/not-found.page').then((m) => m.NotFoundPage),
        title: 'صفحه پیدا نشد | تشکینو',
      },
    ],
  },
];

// Policy for feature routes added in later phases:
//   { path: 'products', canActivate: [permissionGuard],
//     data: { permissions: { all: [Permissions.ProductsRead] } }, loadChildren: ... }
