import { Category } from './catalog.models';
import { flattenCategoryTree, selfAndDescendantIds } from './category-tree';

const c = (id: string, parentId: string | null, sortOrder = 0, title = id): Category => ({
  id,
  parentId,
  slug: id,
  title,
  status: 'published',
  sortOrder,
});

describe('category tree', () => {
  it('orders parents before children, siblings by sortOrder then title, with depth', () => {
    const out = flattenCategoryTree([
      c('b', null, 2),
      c('a', null, 1),
      c('a2', 'a', 2),
      c('a1', 'a', 1),
      c('b1', 'b', 0),
    ]);
    expect(out.map((n) => `${n.category.id}:${n.depth}`)).toEqual([
      'a:0',
      'a1:1',
      'a2:1',
      'b:0',
      'b1:1',
    ]);
  });

  it('shows orphans as roots instead of hiding them', () => {
    expect(flattenCategoryTree([c('x', 'missing')]).map((n) => n.depth)).toEqual([0]);
  });

  it('does not loop or duplicate on cyclic data', () => {
    const out = flattenCategoryTree([c('a', 'b'), c('b', 'a'), c('s', 's')]);
    expect(new Set(out.map((n) => n.category.id)).size).toBe(out.length);
  });

  it('computes self and all descendants', () => {
    const all = [c('a', null), c('b', 'a'), c('d', 'b'), c('z', null)];
    expect([...selfAndDescendantIds(all, 'a')].sort()).toEqual(['a', 'b', 'd']);
    expect([...selfAndDescendantIds(all, 'z')]).toEqual(['z']);
  });
});
