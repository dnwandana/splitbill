import test from 'node:test'
import assert from 'node:assert/strict'
import { parseReceiptResponse } from './receipt.ts'

const valid = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          items: [{ name: 'Pizza', quantity: 1, price: 18 }],
          tax: 2,
          total: 20
        })
      }
    }
  ]
}

test('parses a valid completion into a receipt', () => {
  const receipt = parseReceiptResponse(valid)
  assert.equal(receipt.items.length, 1)
  assert.equal(receipt.items[0]!.name, 'Pizza')
  assert.equal(receipt.total, 20)
})

test('throws when choices are missing (upstream error envelope)', () => {
  assert.throws(() => parseReceiptResponse({ error: { message: 'no credits' } }))
})

test('throws when content is not valid JSON', () => {
  assert.throws(() =>
    parseReceiptResponse({ choices: [{ message: { content: 'not json' } }] })
  )
})

test('throws when JSON fails the receipt schema', () => {
  const bad = {
    choices: [{ message: { content: JSON.stringify({ items: 'nope' }) } }]
  }
  assert.throws(() => parseReceiptResponse(bad))
})

test('throws when the model returns a negative price', () => {
  const bad = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            items: [{ name: 'Pizza', quantity: 1, price: -5 }],
            tax: 0,
            total: -5
          })
        }
      }
    ]
  }
  assert.throws(() => parseReceiptResponse(bad))
})

test('throws when the model returns a non-positive quantity', () => {
  const bad = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            items: [{ name: 'Pizza', quantity: 0, price: 18 }],
            tax: 0,
            total: 18
          })
        }
      }
    ]
  }
  assert.throws(() => parseReceiptResponse(bad))
})
