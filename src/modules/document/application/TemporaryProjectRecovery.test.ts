import { describe, expect, it } from 'vitest'

import {
  TEMPORARY_PROJECT_SCHEMA_VERSION,
  TEMPORARY_PROJECT_TTL_MS,
  createTemporaryProjectRecovery,
} from '@/modules/document/application/TemporaryProjectRecovery'
import type { TemporaryProjectStoragePort } from '@/modules/document/application/ports/TemporaryProjectStoragePort'

function createMemoryStorage(initial: string | null = null): Readonly<{
  port: TemporaryProjectStoragePort
  value(): string | null
  removals(): number
}> {
  let value = initial
  let removals = 0

  return {
    port: {
      read: () => value,
      write: (next) => {
        value = next
      },
      remove: () => {
        value = null
        removals += 1
      },
    },
    value: () => value,
    removals: () => removals,
  }
}

function record(overrides: Readonly<Record<string, unknown>> = {}): string {
  const savedAt = 1_000
  return JSON.stringify({
    schemaVersion: TEMPORARY_PROJECT_SCHEMA_VERSION,
    name: 'recovered',
    source: '[idea] Recovered',
    dirty: true,
    savedAt,
    expiresAt: savedAt + TEMPORARY_PROJECT_TTL_MS,
    ...overrides,
  })
}

describe('TemporaryProjectRecovery', () => {
  it('stores the minimal versioned record with a 24-hour sliding TTL', () => {
    const storage = createMemoryStorage()
    let currentTime = 5_000
    const recovery = createTemporaryProjectRecovery({
      storage: storage.port,
      now: () => currentTime,
    })

    expect(
      recovery.storeTemporaryProject({
        name: 'project',
        source: '[idea] Text only',
        dirty: true,
      }),
    ).toEqual({
      type: 'stored',
      savedAt: currentTime,
      expiresAt: currentTime + TEMPORARY_PROJECT_TTL_MS,
    })
    expect(JSON.parse(storage.value()!)).toEqual({
      schemaVersion: 1,
      name: 'project',
      source: '[idea] Text only',
      dirty: true,
      savedAt: currentTime,
      expiresAt: currentTime + TEMPORARY_PROJECT_TTL_MS,
    })

    currentTime += 60_000
    const refreshed = recovery.storeTemporaryProject({
      name: 'project',
      source: '[idea] Latest',
      dirty: true,
    })
    expect(refreshed).toEqual({
      type: 'stored',
      savedAt: currentTime,
      expiresAt: currentTime + TEMPORARY_PROJECT_TTL_MS,
    })
  })

  it('restores a valid record before the exact expiry boundary', () => {
    const storage = createMemoryStorage(record())
    const recovery = createTemporaryProjectRecovery({
      storage: storage.port,
      now: () => 1_000 + TEMPORARY_PROJECT_TTL_MS - 1,
    })

    expect(recovery.loadTemporaryProject()).toEqual({
      type: 'restored',
      project: {
        name: 'recovered',
        source: '[idea] Recovered',
        dirty: true,
      },
      savedAt: 1_000,
      expiresAt: 1_000 + TEMPORARY_PROJECT_TTL_MS,
    })
    expect(storage.removals()).toBe(0)
  })

  it.each([
    ['exact expiry', record(), 1_000 + TEMPORARY_PROJECT_TTL_MS],
    ['future timestamp', record(), 999],
    ['corrupt JSON', '{broken', 2_000],
    ['unknown schema', record({ schemaVersion: 2 }), 2_000],
    ['unexpected field', record({ graph: { nodes: [] } }), 2_000],
    ['invalid TTL', record({ expiresAt: 2_000 }), 1_500],
    ['empty name', record({ name: '  ' }), 2_000],
  ])('removes %s instead of restoring it', (_name, value, currentTime) => {
    const storage = createMemoryStorage(value)
    const recovery = createTemporaryProjectRecovery({
      storage: storage.port,
      now: () => currentTime,
    })

    expect(recovery.loadTemporaryProject()).toEqual({ type: 'empty' })
    expect(storage.value()).toBeNull()
    expect(storage.removals()).toBe(1)
  })

  it.each(['read', 'write', 'remove'] as const)(
    'normalizes %s failures without throwing',
    (operation) => {
      const port: TemporaryProjectStoragePort = {
        read: () => {
          if (operation === 'read') throw new Error('blocked')
          return operation === 'remove' ? '{broken' : null
        },
        write: () => {
          if (operation === 'write') throw new Error('quota')
        },
        remove: () => {
          if (operation === 'remove') throw new Error('blocked')
        },
      }
      const recovery = createTemporaryProjectRecovery({ storage: port, now: () => 2_000 })

      if (operation === 'read' || operation === 'remove') {
        expect(recovery.loadTemporaryProject()).toEqual({ type: 'unavailable' })
      } else {
        expect(
          recovery.storeTemporaryProject({ name: 'project', source: 'text', dirty: true }),
        ).toEqual({ type: 'unavailable' })
      }
    },
  )

  it('clears the current record explicitly', () => {
    const storage = createMemoryStorage(record())
    const recovery = createTemporaryProjectRecovery({ storage: storage.port })

    expect(recovery.clearTemporaryProject()).toEqual({ type: 'cleared' })
    expect(storage.value()).toBeNull()
  })
})
