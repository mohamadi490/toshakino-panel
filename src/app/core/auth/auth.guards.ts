import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { PermissionRequirement } from '../authorization/permissions';
import { AuthStore } from './auth.store';

export const authGuard: CanActivateFn = (_route, state) => {
  const store = inject(AuthStore);
  const router = inject(Router);
  return store.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  return store.isAuthenticated() ? inject(Router).createUrlTree(['/']) : true;
};

/** Reads `data.permissions` from the route; a route with no policy is denied. */
export const permissionGuard: CanActivateFn = (route) => {
  const store = inject(AuthStore);
  const req = route.data['permissions'] as PermissionRequirement | undefined;
  if (!req || !store.can(req)) return inject(Router).createUrlTree(['/forbidden']);
  return true;
};

/** Keeps lazy chunks of unauthorised features from even being downloaded. */
export const permissionMatch: CanMatchFn = (route) => {
  const store = inject(AuthStore);
  const req = route.data?.['permissions'] as PermissionRequirement | undefined;
  return !!req && store.can(req);
};
