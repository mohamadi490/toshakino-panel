import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../auth/auth.store';
import { Permissions } from '../authorization/permissions';
import { NAV_ITEMS, NavigationService } from './navigation';

describe('NavigationService', () => {
  it('only lists items the user may see', () => {
    const store = TestBed.inject(AuthStore);
    const nav = TestBed.inject(NavigationService);
    store.setSession({ id: '1', displayName: 'م', roles: [], permissions: [] });
    const open = nav.items().length;
    expect(open).toBe(NAV_ITEMS.filter((i) => !i.permissions).length);
    store.setSession({
      id: '1',
      displayName: 'م',
      roles: [],
      permissions: Object.values(Permissions),
    });
    expect(nav.items().length).toBe(NAV_ITEMS.length);
  });
});
