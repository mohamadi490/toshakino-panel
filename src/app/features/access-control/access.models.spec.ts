import { groupPermissions } from './access.models';

describe('groupPermissions', () => {
  it('groups codes by their resource prefix keeping first-seen order', () => {
    const out = groupPermissions([
      { code: 'orders.read' },
      { code: 'products.read' },
      { code: 'orders.update' },
      { code: 'system' },
    ]);
    expect(out.map((g) => g.group)).toEqual(['orders', 'products', 'system']);
    expect(out[0]!.items.map((i) => i.code)).toEqual(['orders.read', 'orders.update']);
  });
  it('returns an empty list for no permissions', () => expect(groupPermissions([])).toEqual([]));
});
