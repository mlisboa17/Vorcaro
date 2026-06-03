/**
 * Lógica pura de seleção da revisão da Inbox (testável sem React).
 */

export function toggleSelectionId(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

export function setSelectionForIds(
  selected: ReadonlySet<string>,
  ids: readonly string[],
  shouldSelect: boolean,
): Set<string> {
  const next = new Set(selected);
  for (const id of ids) {
    if (shouldSelect) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }
  return next;
}

export function selectRangeInOrder(
  orderedSelectableIds: readonly string[],
  anchorId: string,
  targetId: string,
  selected: ReadonlySet<string>,
): Set<string> {
  const anchorIndex = orderedSelectableIds.indexOf(anchorId);
  const targetIndex = orderedSelectableIds.indexOf(targetId);

  if (anchorIndex < 0 || targetIndex < 0) {
    return toggleSelectionId(selected, targetId);
  }

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  const rangeIds = orderedSelectableIds.slice(start, end + 1);

  return setSelectionForIds(selected, rangeIds, true);
}

export function invertVisibleSelection(
  selected: ReadonlySet<string>,
  visibleSelectableIds: readonly string[],
): Set<string> {
  const next = new Set(selected);
  for (const id of visibleSelectableIds) {
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
  }
  return next;
}

export function selectFirstNVisible(
  selected: ReadonlySet<string>,
  visibleSelectableIds: readonly string[],
  count: number,
): Set<string> {
  const safeCount = Math.max(0, Math.min(count, visibleSelectableIds.length));
  const ids = visibleSelectableIds.slice(0, safeCount);
  return setSelectionForIds(selected, ids, true);
}

export function getSelectionCounterText(params: {
  selectedCount: number;
  visibleSelectableCount: number;
  totalSelectableCount: number;
}): string {
  const { selectedCount, visibleSelectableCount, totalSelectableCount } = params;

  if (totalSelectableCount > visibleSelectableCount) {
    return `${selectedCount} selecionados de ${visibleSelectableCount} visíveis (${totalSelectableCount} total)`;
  }

  return `${selectedCount} selecionados de ${visibleSelectableCount} visíveis`;
}

export function getSelectedIdsArray(selected: ReadonlySet<string>): string[] {
  return [...selected];
}
