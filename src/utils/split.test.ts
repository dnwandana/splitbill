import test from 'node:test'
import assert from 'node:assert/strict'
import { computeSplit, allocateRoundedTotals } from './split.ts'
import type { Receipt } from '../types/receipt.ts'

const receipt: Receipt = {
  items: [
    { name: 'Pizza', quantity: 1, price: 20 }, // item 0
    { name: 'Wine', quantity: 2, price: 10 } // item 1, total 20
  ],
  tax: 8,
  total: 48
}

test('single-owner item: full cost to one participant', () => {
  const assignments = { 0: { 0: 1 } }
  const result = computeSplit(receipt, 2, assignments)
  assert.equal(result[0]!.itemsTotal, 20)
  assert.equal(result[1]!.itemsTotal, 0)
})

test('shared item by quantity: proportional split', () => {
  const assignments = { 1: { 0: 1, 1: 1 } }
  const result = computeSplit(receipt, 2, assignments)
  assert.equal(result[0]!.itemsTotal, 10)
  assert.equal(result[1]!.itemsTotal, 10)
  assert.equal(result[0]!.items[0]!.sharedWith, 2)
})

test('proportional tax follows item share', () => {
  const assignments = { 0: { 0: 1 }, 1: { 0: 2 } }
  const result = computeSplit(receipt, 2, assignments)
  assert.equal(result[0]!.taxPortion, 8)
  assert.equal(result[0]!.total, 48)
})

test('zero tax yields zero tax portions', () => {
  const noTax: Receipt = { ...receipt, tax: 0, total: 40 }
  const assignments = { 0: { 0: 1 } }
  const result = computeSplit(noTax, 2, assignments)
  assert.equal(result[0]!.taxPortion, 0)
})

test('uses full participant index (blank mid-list does not shift)', () => {
  const assignments = { 0: { 2: 1 } }
  const result = computeSplit(receipt, 3, assignments)
  assert.equal(result[0]!.itemsTotal, 0)
  assert.equal(result[1]!.itemsTotal, 0)
  assert.equal(result[2]!.itemsTotal, 20)
})

test('allocateRoundedTotals: sum of rounded equals rounded sum', () => {
  const raw = [10.005, 10.005, 9.99] // sum 30.0 -> 3000 cents
  const out = allocateRoundedTotals(raw)
  const sumCents = Math.round(out.reduce((s, v) => s + v, 0) * 100)
  assert.equal(sumCents, 3000)
})

test('allocateRoundedTotals: distributes leftover cent to largest remainder', () => {
  const raw = [100 / 3, 100 / 3, 100 / 3]
  const out = allocateRoundedTotals(raw)
  const sumCents = Math.round(out.reduce((s, v) => s + v, 0) * 100)
  assert.equal(sumCents, 10000)
})

test('allocateRoundedTotals: already-exact inputs unchanged', () => {
  const out = allocateRoundedTotals([10, 20, 30])
  assert.deepEqual(out, [10, 20, 30])
})
