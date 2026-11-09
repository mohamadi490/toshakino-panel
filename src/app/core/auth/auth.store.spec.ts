import { TestBed } from '@angular/core/testing';
import { Permissions } from '../authorization/permissions';
import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  let store: AuthStore;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(AuthStore);
  });

  it('starts unknown and unauthenticated', () => {
    expect(store.status()).toBe('unknown');
    expect(store.isAuthenticated()).toBe(false);
    expect(store.accessToken).toBeNull();
  });

  it('exposes effective permissions after setSession', () => {
    store.setSession({
      id: '1',
      displayName: 'م',
      roles: [],
      permissions: [Permissions.OrdersRead],
    });
    expect(store.isAuthenticated()).toBe(true);
    expect(store.can({ all: [Permissions.OrdersRead] })).toBe(true);
    expect(store.can({ all: [Permissions.OrdersCancel] })).toBe(false);
  });

  it('clear() wipes token, user and permissions', () => {
    store.setToken('abc');
    store.setSession({
      id: '1',
      displayName: 'م',
      roles: [],
      permissions: [Permissions.OrdersRead],
    });
    store.clear();
    expect(store.accessToken).toBeNull();
    expect(store.user()).toBeNull();
    expect(store.status()).toBe('anonymous');
    expect(store.can({ all: [Permissions.OrdersRead] })).toBe(false);
  });

  it('never persists the token in web storage', () => {
    store.setToken('super-secret-token');
    const dump = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage });
    expect(dump).not.toContain('super-secret-token');
  });
});
