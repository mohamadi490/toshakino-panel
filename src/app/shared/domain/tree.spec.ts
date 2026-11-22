import { TreeItem, flattenTree, selfAndDescendantIds } from './tree';

const n = (id: number, parentId: number | null, position = 0, name = `n${id}`): TreeItem => ({
  id,
  parentId,
  position,
  name,
});

describe('tree', () => {
  it('orders parents before children, siblings by position then name, with depth', () => {
    const out = flattenTree([n(2, null, 2), n(1, null, 1), n(12, 1, 2), n(11, 1, 1), n(21, 2, 0)]);
    expect(out.map((x) => `${x.item.id}:${x.depth}`)).toEqual([
      '1:0',
      '11:1',
      '12:1',
      '2:0',
      '21:1',
    ]);
  });
  it('sorts equal positions by Persian name', () => {
    const out = flattenTree([n(1, null, 0, 'ب'), n(2, null, 0, 'الف')]);
    expect(out.map((x) => x.item.id)).toEqual([2, 1]);
  });
  it('shows orphans (unknown parent) as roots instead of hiding them', () => {
    expect(flattenTree([n(5, 999)]).map((x) => x.depth)).toEqual([0]);
  });
  it('does not loop or duplicate on cyclic data and still surfaces every node', () => {
    const out = flattenTree([n(1, 2), n(2, 1), n(3, 3)]);
    expect(out.map((x) => x.item.id).sort()).toEqual([1, 2, 3]);
    expect(new Set(out.map((x) => x.item.id)).size).toBe(out.length);
  });
  it('computes self and all descendants', () => {
    const all = [n(1, null), n(2, 1), n(4, 2), n(9, null)];
    expect([...selfAndDescendantIds(all, 1)].sort()).toEqual([1, 2, 4]);
    expect([...selfAndDescendantIds(all, 9)]).toEqual([9]);
  });
});
