import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  reindexAfterParticipantRemoval,
  reindexAfterItemRemoval,
  assignItemToParticipant
} from './assignments.ts'

test('reindexAfterParticipantRemoval drops the removed participant', () => {
  const result = reindexAfterParticipantRemoval({ 0: { 0: 1, 1: 2 } }, 0)
  assert.deepEqual(result, { 0: { 0: 2 } }) // participant 1 shifts down to 0
})

test('reindexAfterParticipantRemoval shifts only higher indices', () => {
  const result = reindexAfterParticipantRemoval({ 0: { 0: 1, 2: 3 } }, 1)
  assert.deepEqual(result, { 0: { 0: 1, 1: 3 } }) // p0 stays, p2 -> p1
})

test('reindexAfterParticipantRemoval preserves all item keys', () => {
  const result = reindexAfterParticipantRemoval({ 0: { 1: 1 }, 1: {} }, 0)
  assert.deepEqual(result, { 0: { 0: 1 }, 1: {} })
})

test('reindexAfterItemRemoval drops the removed item and shifts higher items', () => {
  const result = reindexAfterItemRemoval({ 0: { 0: 1 }, 1: { 0: 2 }, 2: { 1: 3 } }, 1)
  assert.deepEqual(result, { 0: { 0: 1 }, 1: { 1: 3 } }) // item2 -> item1
})

test('reindexAfterItemRemoval keeps items before the removed index', () => {
  const result = reindexAfterItemRemoval({ 0: { 0: 1 }, 1: { 0: 2 } }, 1)
  assert.deepEqual(result, { 0: { 0: 1 } })
})

test('assignItemToParticipant defaults quantity to 1', () => {
  const result = assignItemToParticipant({}, 0, 2)
  assert.deepEqual(result, { 0: { 2: 1 } })
})

test('assignItemToParticipant does not overwrite an existing quantity', () => {
  const start = { 0: { 2: 5 } }
  const result = assignItemToParticipant(start, 0, 2)
  assert.deepEqual(result, { 0: { 2: 5 } })
})
