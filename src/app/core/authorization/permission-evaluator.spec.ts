import { satisfies } from './permission-evaluator';
import { Permissions } from './permissions';

describe('satisfies', () => {
  const granted = new Set<string>([Permissions.ProductsRead, Permissions.OrdersRead]);

  it('allows when no requirement is given', () => expect(satisfies(granted, undefined)).toBe(true));
  it('requires every permission in `all`', () => {
    expect(satisfies(granted, { all: [Permissions.ProductsRead, Permissions.OrdersRead] })).toBe(
      true,
    );
    expect(
      satisfies(granted, { all: [Permissions.ProductsRead, Permissions.ProductsCreate] }),
    ).toBe(false);
  });
  it('requires at least one permission in `any`', () => {
    expect(satisfies(granted, { any: [Permissions.UsersRead, Permissions.OrdersRead] })).toBe(true);
    expect(satisfies(granted, { any: [Permissions.UsersRead, Permissions.RolesRead] })).toBe(false);
  });
  it('combines all + any', () => {
    expect(
      satisfies(granted, { all: [Permissions.ProductsRead], any: [Permissions.OrdersRead] }),
    ).toBe(true);
    expect(
      satisfies(granted, { all: [Permissions.ProductsRead], any: [Permissions.UsersRead] }),
    ).toBe(false);
  });
  it('denies everything for an empty permission set', () => {
    expect(satisfies(new Set(), { all: [Permissions.ProductsRead] })).toBe(false);
  });
});
