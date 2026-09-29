export function applyMultiSelect(
  items: string[],
  currentSelection: string[],
  anchorIndex: number,
  clickedIndex: number,
  modifiers: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
): { selection: string[]; anchorIndex: number } {
  if (clickedIndex < 0 || clickedIndex >= items.length) {
    return { selection: currentSelection, anchorIndex }
  }

  const clicked = items[clickedIndex]
  const isToggle = modifiers.ctrlKey || modifiers.metaKey

  if (modifiers.shiftKey && anchorIndex >= 0 && anchorIndex < items.length) {
    const from = Math.min(anchorIndex, clickedIndex)
    const to = Math.max(anchorIndex, clickedIndex)
    const range = items.slice(from, to + 1)

    if (isToggle) {
      const next = new Set(currentSelection)
      for (const item of range) next.add(item)
      return { selection: items.filter((item) => next.has(item)), anchorIndex }
    }

    return { selection: range, anchorIndex }
  }

  if (isToggle) {
    const next = new Set(currentSelection)
    if (next.has(clicked)) next.delete(clicked)
    else next.add(clicked)
    return {
      selection: items.filter((item) => next.has(item)),
      anchorIndex: clickedIndex,
    }
  }

  return { selection: [clicked], anchorIndex: clickedIndex }
}
