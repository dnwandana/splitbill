export type ItemAssignments = Record<number, Record<number, number>>

// Reindex assignments after the participant at `removedIndex` is removed:
// drop their entries and shift every higher participant index down by one.
export function reindexAfterParticipantRemoval(
  assignments: ItemAssignments,
  removedIndex: number
): ItemAssignments {
  const result: ItemAssignments = {}
  for (const itemIndexStr of Object.keys(assignments)) {
    const itemIndex = Number(itemIndexStr)
    const itemMap = assignments[itemIndex]
    if (!itemMap) continue
    const newItemMap: Record<number, number> = {}
    for (const pIndexStr of Object.keys(itemMap)) {
      const pIndex = Number(pIndexStr)
      if (pIndex === removedIndex) continue
      const newPIndex = pIndex > removedIndex ? pIndex - 1 : pIndex
      const quantity = itemMap[pIndex]
      if (quantity !== undefined) newItemMap[newPIndex] = quantity
    }
    result[itemIndex] = newItemMap
  }
  return result
}

// Reindex assignments after the item at `removedItemIndex` is removed:
// keep lower item keys, drop the removed one, shift higher item keys down by one.
export function reindexAfterItemRemoval(
  assignments: ItemAssignments,
  removedItemIndex: number
): ItemAssignments {
  const result: ItemAssignments = {}
  for (const itemIndexStr of Object.keys(assignments)) {
    const itemIndex = Number(itemIndexStr)
    const itemMap = assignments[itemIndex]
    if (!itemMap) continue
    if (itemIndex < removedItemIndex) {
      result[itemIndex] = itemMap
    } else if (itemIndex > removedItemIndex) {
      result[itemIndex - 1] = itemMap
    }
  }
  return result
}

// Assign one unit of an item to a participant, defaulting to quantity 1.
// Existing quantities are left untouched. Returns a new object.
export function assignItemToParticipant(
  assignments: ItemAssignments,
  itemIndex: number,
  participantIndex: number
): ItemAssignments {
  const itemMap = assignments[itemIndex] ?? {}
  if (itemMap[participantIndex]) return assignments
  return {
    ...assignments,
    [itemIndex]: { ...itemMap, [participantIndex]: 1 }
  }
}
