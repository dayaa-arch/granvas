import { describe, expect, it, vi } from 'vitest'

import {
  createNewGranvasUrl,
  resolveGranvasProjectLaunch,
} from '@/app/projectLaunch'

const slotId = '550e8400-e29b-41d4-a716-446655440000'

describe('Granvas Project launch', () => {
  it('keeps ordinary launches on the compatible default Project', () => {
    const createSlotId = vi.fn(() => slotId)

    expect(resolveGranvasProjectLaunch('', createSlotId)).toEqual({
      type: 'default',
    })
    expect(resolveGranvasProjectLaunch('#workspace', createSlotId)).toEqual({
      type: 'default',
    })
    expect(createSlotId).not.toHaveBeenCalled()
  })

  it('creates a canonical isolated Project for #new', () => {
    expect(resolveGranvasProjectLaunch('#new', () => slotId)).toEqual({
      type: 'isolated-project',
      slotId,
      canonicalHash: `#project=${slotId}`,
      initialProject: { name: 'untitled', source: '' },
    })
  })

  it('restores a valid canonical Project slot without creating another ID', () => {
    const createSlotId = vi.fn(() => 'unused')

    expect(
      resolveGranvasProjectLaunch(`#project=${slotId.toUpperCase()}`, createSlotId),
    ).toMatchObject({
      type: 'isolated-project',
      slotId,
      canonicalHash: `#project=${slotId}`,
    })
    expect(createSlotId).not.toHaveBeenCalled()
  })

  it.each([
    '#project=../../other-key',
    '#project=',
    '#project=550e8400-e29b-11d4-a716-446655440000',
    '#project=550e8400-e29b-41d4-0716-446655440000',
  ])('rejects an invalid Project slot without using it as storage identity', (hash) => {
    expect(resolveGranvasProjectLaunch(hash, () => slotId)).toEqual({
      type: 'default',
    })
  })

  it('falls back safely when secure ID generation is unavailable', () => {
    expect(
      resolveGranvasProjectLaunch('#new', () => {
        throw new Error('unavailable')
      }),
    ).toEqual({ type: 'default' })
  })

  it('rejects an invalid ID returned by the secure ID factory', () => {
    expect(resolveGranvasProjectLaunch('#new', () => '../../other-key')).toEqual({
      type: 'default',
    })
  })

  it('creates a same-page URL with only the launch fragment replaced', () => {
    expect(
      createNewGranvasUrl('https://example.com/editor?mode=local#project=old'),
    ).toBe('https://example.com/editor?mode=local#new')
  })
})
