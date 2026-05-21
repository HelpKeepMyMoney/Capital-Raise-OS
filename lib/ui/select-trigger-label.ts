/**
 * Base UI Select shows the raw `value` in the closed trigger unless you pass an explicit
 * label as children of SelectValue. Use these helpers to resolve id → name for triggers.
 */

export type IdNameOption = { id: string; name: string };

export type ValueLabelOption = { value: string; label: string };

export function idNameSelectLabel(
  value: string | undefined | null,
  items: readonly IdNameOption[],
  opts?: {
    sentinel?: string;
    sentinelLabel?: string;
    fallback?: (id: string) => string;
  },
): string | undefined {
  if (!value) return undefined;
  if (opts?.sentinel && value === opts.sentinel) return opts.sentinelLabel;
  const hit = items.find((x) => x.id === value);
  if (hit?.name?.trim()) return hit.name.trim();
  return opts?.fallback?.(value) ?? value;
}

export function valueLabelSelectLabel(
  value: string | undefined | null,
  items: readonly ValueLabelOption[],
  opts?: { sentinel?: string; sentinelLabel?: string },
): string | undefined {
  if (!value) return undefined;
  if (opts?.sentinel && value === opts.sentinel) return opts.sentinelLabel;
  const hit = items.find((x) => x.value === value);
  if (hit?.label) return hit.label;
  return value;
}

/** Folder / parent pickers that use `__root__` as the room-root sentinel. */
export function folderParentSelectLabel(
  parentId: string | null | undefined,
  options: readonly { id: string; label: string }[],
  opts?: { rootSentinel?: string; rootLabel?: string; fallbackName?: string },
): string | undefined {
  const rootSentinel = opts?.rootSentinel ?? "__root__";
  const rootLabel = opts?.rootLabel ?? "Room root";
  if (!parentId || parentId === rootSentinel) return rootLabel;
  const hit = options.find((o) => o.id === parentId);
  if (hit?.label) return hit.label;
  if (opts?.fallbackName?.trim()) return opts.fallbackName.trim();
  return parentId;
}
