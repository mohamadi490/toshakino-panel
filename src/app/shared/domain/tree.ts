export interface TreeItem {
  id: number;
  parentId: number | null;
  position: number;
  name: string;
}

export interface TreeNode<T extends TreeItem> {
  item: T;
  depth: number;
}

/**
 * Flattens a parentId list into display order (parents before children; siblings by `position`
 * then name). Orphans (unknown or self parent) are shown as roots; cyclic data cannot loop because
 * every node is emitted at most once.
 */
export function flattenTree<T extends TreeItem>(items: readonly T[]): TreeNode<T>[] {
  const ids = new Set(items.map((c) => c.id));
  const children = new Map<number | null, T[]>();
  for (const c of items) {
    const key = c.parentId !== null && ids.has(c.parentId) && c.parentId !== c.id ? c.parentId : null;
    children.set(key, [...(children.get(key) ?? []), c]);
  }
  const byOrder = (a: T, b: T) => a.position - b.position || a.name.localeCompare(b.name, 'fa');

  const out: TreeNode<T>[] = [];
  const seen = new Set<number>();
  const walk = (parent: number | null, depth: number) => {
    for (const c of [...(children.get(parent) ?? [])].sort(byOrder)) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ item: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  // Pure cycles have no root; surface them instead of hiding data.
  for (const c of [...items].sort(byOrder)) {
    if (!seen.has(c.id)) { seen.add(c.id); out.push({ item: c, depth: 0 }); walk(c.id, 1); }
  }
  return out;
}

/** Ids of `rootId` and everything below it - invalid choices for its own parent (would create a cycle). */
export function selfAndDescendantIds(items: readonly TreeItem[], rootId: number): Set<number> {
  const result = new Set<number>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of items) {
      if (c.parentId !== null && result.has(c.parentId) && !result.has(c.id)) {
        result.add(c.id);
        grew = true;
      }
    }
  }
  return result;
}
