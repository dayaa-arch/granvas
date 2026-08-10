import { describe, expect, it } from 'vitest'

import { createApplication } from '@/app/bootstrap/createApplication'
import { DagreGraphLayoutWorkerAdapter } from '@/modules/graph/infrastructure/worker/DagreGraphLayoutWorkerAdapter'

describe('createApplication', () => {
  it('creates the deterministic application metadata', () => {
    expect(createApplication()).toMatchObject({
      productName: 'Granvas',
      version: '0.1',
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
})
