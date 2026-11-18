export interface UserListQuery {
  page: number;
  pageSize: number;
  q?: string;
  roleId?: number;
  isActive?: boolean;
  [key: string]: string | number | boolean | undefined;
}

/** Groups permission codes by their resource prefix (`orders.read` -> `orders`). */
export function groupPermissions<T extends { code: string }>(
  items: readonly T[],
): { group: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const p of items) {
    const group = p.code.includes('.') ? p.code.slice(0, p.code.indexOf('.')) : p.code;
    map.set(group, [...(map.get(group) ?? []), p]);
  }
  return [...map.entries()].map(([group, list]) => ({ group, items: list }));
}
