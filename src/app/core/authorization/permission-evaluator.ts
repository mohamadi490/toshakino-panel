import { PermissionRequirement } from './permissions';

/** Pure evaluator - UX only. The backend remains the authority for every endpoint. */
export function satisfies(
  granted: ReadonlySet<string>,
  req: PermissionRequirement | undefined,
): boolean {
  if (!req) return true;
  const all = req.all ?? [];
  const any = req.any ?? [];
  if (!all.every((p) => granted.has(p))) return false;
  if (any.length > 0 && !any.some((p) => granted.has(p))) return false;
  return true;
}
