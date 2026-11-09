import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Permissions } from '../authorization/permissions';
import { authGuard, guestGuard, permissionGuard } from './auth.guards';
import { AuthStore } from './auth.store';

function run<T>(fn: () => T): T {
  return TestBed.runInInjectionContext(fn);
}
const state = (url: string) => ({ url }) as RouterStateSnapshot;
const route = (data: Record<string, unknown> = {}) =>
  ({ data }) as unknown as ActivatedRouteSnapshot;
const asPath = (r: unknown) => TestBed.inject(Router).serializeUrl(r as UrlTree);

describe('guards', () => {
  let store: AuthStore;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    store = TestBed.inject(AuthStore);
  });

  it('authGuard redirects anonymous users to /login with returnUrl', () => {
    expect(asPath(run(() => authGuard(route(), state('/orders?x=1'))))).toBe(
      '/login?returnUrl=%2Forders%3Fx%3D1',
    );
  });

  it('authGuard allows authenticated users', () => {
    store.setSession({ id: '1', displayName: 'م', roles: [], permissions: [] });
    expect(run(() => authGuard(route(), state('/')))).toBe(true);
  });

  it('guestGuard sends authenticated users away from /login', () => {
    store.setSession({ id: '1', displayName: 'م', roles: [], permissions: [] });
    expect(asPath(run(() => guestGuard(route(), state('/login'))))).toBe('/');
  });

  it('permissionGuard allows with the required permission', () => {
    store.setSession({
      id: '1',
      displayName: 'م',
      roles: [],
      permissions: [Permissions.OrdersRead],
    });
    expect(
      run(() =>
        permissionGuard(
          route({ permissions: { all: [Permissions.OrdersRead] } }),
          state('/orders'),
        ),
      ),
    ).toBe(true);
  });

  it('permissionGuard redirects to /forbidden without the permission', () => {
    store.setSession({ id: '1', displayName: 'م', roles: [], permissions: [] });
    const r = run(() =>
      permissionGuard(route({ permissions: { all: [Permissions.OrdersRead] } }), state('/orders')),
    );
    expect(asPath(r)).toBe('/forbidden');
  });

  it('permissionGuard denies a route that declares no policy', () => {
    store.setSession({
      id: '1',
      displayName: 'م',
      roles: [],
      permissions: [Permissions.OrdersRead],
    });
    expect(asPath(run(() => permissionGuard(route(), state('/x'))))).toBe('/forbidden');
  });
});
