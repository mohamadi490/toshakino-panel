import { Subject, of, throwError } from 'rxjs';
import { PagedList, PagedResponse } from './paged-list';

const page = (items: number[], p = 1): PagedResponse<number> => ({
  data: items,
  meta: { page: p, pageSize: 20, totalItems: items.length, totalPages: 1 },
});

describe('PagedList', () => {
  it('loads items and meta', () => {
    const l = new PagedList<number, void>(
      () => of(page([1, 2])),
      () => 'err',
    );
    l.load(undefined);
    expect(l.items()).toEqual([1, 2]);
    expect(l.meta()?.totalItems).toBe(2);
    expect(l.loading()).toBe(false);
  });

  it('exposes the mapped error message', () => {
    const l = new PagedList<number, void>(
      () => throwError(() => new Error('x')),
      () => 'مشکل',
    );
    l.load(undefined);
    expect(l.error()).toBe('مشکل');
    expect(l.loading()).toBe(false);
  });

  it('ignores a stale response when a newer load started', () => {
    const first = new Subject<PagedResponse<number>>();
    const second = new Subject<PagedResponse<number>>();
    const sources = [first, second];
    const l = new PagedList<number, void>(
      () => sources.shift()!,
      () => 'err',
    );
    l.load(undefined);
    l.load(undefined);
    second.next(page([2]));
    first.next(page([1])); // stale: must not overwrite
    expect(l.items()).toEqual([2]);
  });
});
