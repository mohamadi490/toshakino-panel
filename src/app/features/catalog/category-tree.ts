import { Category } from './catalog.models';

export interface CategoryNode {
  category: Category;
  depth: number;
}

/**
 * Flattens a parentId list into display order (parents before children, siblings by
 * sortOrder then title). Orphans (unknown parent) are shown as roots; cycles cannot
 * loop forever because every node is emitted at most once.
 */
export function flattenCategoryTree(categories: readonly Category[]): CategoryNode[] {
  const ids = new Set(categories.map((c) => c.id));
  const children = new Map<string | null, Category[]>();
  for (const c of categories) {
    const key =
      c.parentId !== null && ids.has(c.parentId) && c.parentId !== c.id ? c.parentId : null;
    children.set(key, [...(children.get(key) ?? []), c]);
  }
  const byOrder = (a: Category, b: Category) =>
    a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'fa');

  const out: CategoryNode[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    for (const c of [...(children.get(parent) ?? [])].sort(byOrder)) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ category: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** Ids of `rootId` and everything below it - invalid choices for its own parent (would create a cycle). */
export function selfAndDescendantIds(categories: readonly Category[], rootId: string): Set<string> {
  const result = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parentId !== null && result.has(c.parentId) && !result.has(c.id)) {
        result.add(c.id);
        grew = true;
      }
    }
  }
  return result;
}
