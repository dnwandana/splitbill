import { z } from 'zod'
import type { Receipt } from '../../types/receipt'

export const receiptSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      // The model is untrusted input: a garbled vision response could emit
      // negative or zero costs/quantities that corrupt the split math, so we
      // reject them here rather than only guarding user edits in the UI.
      quantity: z.number().positive(),
      price: z.number().nonnegative()
    })
  ),
  tax: z.number().nonnegative(),
  total: z.number().nonnegative()
})

// compile-time guarantee the schema output matches the shared contract
const _check = (r: z.infer<typeof receiptSchema>): Receipt => r
void _check

export type { Receipt }

export function parseReceiptResponse(completion: unknown): Receipt {
  const content = (
    completion as { choices?: { message?: { content?: unknown } }[] }
  )?.choices?.[0]?.message?.content

  if (typeof content !== 'string') {
    throw new Error('Malformed completion: missing message content')
  }

  let json: unknown
  try {
    json = JSON.parse(content)
  } catch {
    throw new Error('Model returned non-JSON content')
  }

  const parsed = receiptSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error('Model output failed receipt schema validation')
  }
  return parsed.data
}
