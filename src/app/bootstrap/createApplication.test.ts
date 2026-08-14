import { describe, expect, it } from 'vitest'

import { createApplication } from '@/app/bootstrap/createApplication'
import { DagreGraphLayoutWorkerAdapter } from '@/modules/graph/infrastructure/worker/DagreGraphLayoutWorkerAdapter'
import {
  TEMPORARY_PROJECT_SCHEMA_VERSION,
  TEMPORARY_PROJECT_TTL_MS,
  type TemporaryProjectStoragePort,
} from '@/modules/document'

describe('createApplication', () => {
  it('creates the deterministic application metadata', () => {
    expect(createApplication()).toMatchObject({
      productName: 'Granvas',
      version: '0.1.0',
    })
    expect(createApplication().graphLayout).toBeInstanceOf(
      DagreGraphLayoutWorkerAdapter,
    )
    expect(createApplication().transfer).toEqual(
      expect.objectContaining({
        importProjectFile: expect.any(Function),
        downloadProject: expect.any(Function),
        downloadGraph: expect.any(Function),
      }),
    )
    expect(createApplication().workspace.getSnapshot().status).toEqual({ type: 'idle' })
  })

  it('prevents the composition result from being mutated', () => {
    expect(Object.isFrozen(createApplication())).toBe(true)
  })

  it('prefers a valid temporary Project and preserves its dirty state', () => {
    const savedAt = 1_000
    const storage: TemporaryProjectStoragePort = {
      read: () =>
        JSON.stringify({
          schemaVersion: TEMPORARY_PROJECT_SCHEMA_VERSION,
          name: 'recovered',
          source: '[idea] Reloaded',
          dirty: true,
          savedAt,
          expiresAt: savedAt + TEMPORARY_PROJECT_TTL_MS,
        }),
      write: () => undefined,
      remove: () => undefined,
    }

    const application = createApplication({
      temporaryProjectStorage: storage,
      now: () => savedAt + 1,
    })

    expect(application.temporaryProjectLoad).toMatchObject({
      type: 'restored',
      project: { name: 'recovered', source: '[idea] Reloaded', dirty: true },
    })
    expect(application.workspace.getSnapshot()).toMatchObject({
      document: {
        name: 'recovered',
        source: '[idea] Reloaded',
        status: { type: 'dirty' },
      },
      temporaryStorage: { type: 'stored' },
    })
  })

  it('falls back safely when temporary storage is unavailable', () => {
    const application = createApplication({
      temporaryProjectStorage: {
        read: () => {
          throw new DOMException('Blocked', 'SecurityError')
        },
        write: () => undefined,
        remove: () => undefined,
      },
    })

    expect(application.temporaryProjectLoad).toEqual({ type: 'unavailable' })
    expect(application.workspace.getSnapshot()).toMatchObject({
      document: { name: 'untitled', status: { type: 'clean' } },
      temporaryStorage: { type: 'unavailable' },
    })
  })
})
