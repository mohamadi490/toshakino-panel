import { Route } from '@angular/router';
import { ACCESS_ROUTES } from '../../features/access-control/access.routes';
import { CATALOG_ROUTES } from '../../features/catalog/catalog.routes';
import { CUSTOMERS_ROUTES } from '../../features/customers/customers.routes';
import { INVENTORY_ROUTES } from '../../features/inventory/inventory.routes';
import { ORDERS_ROUTES } from '../../features/orders/orders.routes';
import { ICON_NAMES } from '../../shared/ui/icon';
import { NAV_ITEMS } from './navigation';

/** Lazy feature route trees, keyed by their mount point in app.routes.ts. */
const FEATURES: Record<string, Route[]> = {
  '/orders': ORDERS_ROUTES,
  '/customers': CUSTOMERS_ROUTES,
  '/catalog': CATALOG_ROUTES,
  '/inventory': INVENTORY_ROUTES,
  '/access': ACCESS_ROUTES,
};

function findRoute(url: string): Route | undefined {
  const mount = Object.keys(FEATURES).find((m) => url === m || url.startsWith(`${m}/`));
  if (!mount) return undefined;
  const rest = url.slice(mount.length).replace(/^\//, '');
  return FEATURES[mount]!.find(
    (r) => r.path === rest && r.component === undefined && r.redirectTo === undefined,
  );
}

describe('navigation consistency', () => {
  it('lists every implemented feature entry point (a missing entry makes a feature unreachable)', () => {
    expect(NAV_ITEMS.map((i) => i.id)).toEqual([
      'dashboard',
      'orders',
      'customers',
      'products',
      'categories',
      'inventory',
      'users',
      'roles',
    ]);
  });

  it.each(NAV_ITEMS.filter((i) => i.id !== 'dashboard').map((i) => [i.id, i] as const))(
    'nav item "%s" points to a guarded route whose policy equals the menu policy',
    (_id, item) => {
      const route = findRoute(item.route);
      expect(route, `no route for ${item.route}`).toBeDefined();
      expect(route!.canActivate?.length, 'route must have a guard').toBeGreaterThan(0);
      expect(route!.data?.['permissions']).toEqual(item.permissions);
    },
  );

  it('uses only known icons and unique ids/routes', () => {
    for (const i of NAV_ITEMS) expect(ICON_NAMES, `icon ${i.icon}`).toContain(i.icon);
    expect(new Set(NAV_ITEMS.map((i) => i.id)).size).toBe(NAV_ITEMS.length);
    expect(new Set(NAV_ITEMS.map((i) => i.route)).size).toBe(NAV_ITEMS.length);
  });
});
