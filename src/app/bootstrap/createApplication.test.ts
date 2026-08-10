import { describe, expect, it } from 'vitest'

import { createApplication } from '@/app/bootstrap/createApplication'

describe('createApplication', () => {
  it('creates the deterministic application metadata', () => {
    expect(createApplication()).toEqual({
      productName: 'Granvas',
      version: '0.1',
    })
  })

  it('prevents the composition result from being mutated', () => {
    expect(Object.isFrozen(createApplication())).toBe(true)
  })
})
