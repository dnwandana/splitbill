import type { Receipt } from '../types/receipt'

export interface SplitItem {
  name: string
  cost: number
  sharedWith: number
}

export interface ParticipantSplit {
  itemsTotal: number
  taxPortion: number
  total: number
  items: SplitItem[]
}

/**
 * Computes each participant's raw (unrounded) share of a receipt.
 * Indexed by full participant index (0..participantCount-1) so it matches
 * how `itemAssignments` is keyed. Rounding is applied by callers.
 */
export function computeSplit(
  receipt: Receipt,
  participantCount: number,
  assignments: Record<number, Record<number, number>>
): ParticipantSplit[] {
  const subtotal = receipt.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  const result: ParticipantSplit[] = []
  for (let pIndex = 0; pIndex < participantCount; pIndex++) {
    let itemsTotal = 0
    const items: SplitItem[] = []

    receipt.items.forEach((item, itemIndex) => {
      const itemAssignments = assignments[itemIndex] || {}
      const quantity = itemAssignments[pIndex] || 0
      if (quantity > 0) {
        const totalAssignedQty = Object.values(itemAssignments).reduce(
          (sum, qty) => sum + qty,
          0
        )
        const sharedWith = Object.keys(itemAssignments).length
        const totalItemCost = item.price * item.quantity
        const cost =
          totalAssignedQty > 0
            ? (quantity / totalAssignedQty) * totalItemCost
            : 0
        itemsTotal += cost
        items.push({ name: `${item.name} (x${quantity})`, cost, sharedWith })
      }
    })

    const taxPortion =
      subtotal > 0 ? (itemsTotal / subtotal) * (receipt.tax || 0) : 0
    result.push({
      itemsTotal,
      taxPortion,
      total: itemsTotal + taxPortion,
      items
    })
  }
  return result
}

/**
 * Rounds each raw total to whole cents so that the sum of the rounded values
 * equals the rounded sum of the inputs. Leftover cents are distributed to the
 * participants with the largest fractional remainders (largest-remainder method).
 */
export function allocateRoundedTotals(rawTotals: number[]): number[] {
  const targetCents = Math.round(rawTotals.reduce((s, t) => s + t, 0) * 100)
  const floored = rawTotals.map((t) => Math.floor(t * 100))
  const remainders = rawTotals.map((t, i) => t * 100 - floored[i]!)
  const residual = targetCents - floored.reduce((s, c) => s + c, 0)

  const order = remainders
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r - a.r)
    .map((x) => x.i)

  const cents = [...floored]
  for (let k = 0; k < residual; k++) {
    cents[order[k % order.length]!]! += 1
  }
  return cents.map((c) => c / 100)
}
