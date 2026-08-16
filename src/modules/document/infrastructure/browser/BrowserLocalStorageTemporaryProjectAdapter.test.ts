import { describe, expect, it, vi } from 'vitest'

import {
  BrowserLocalStorageTemporaryProjectAdapter,
  TEMPORARY_PROJECT_STORAGE_KEY,
} from '@/modules/document/infrastructure/browser/BrowserLocalStorageTemporaryProjectAdapter'

describe('BrowserLocalStorageTemporaryProjectAdapter', () => {
  it('delegates read, write, and remove to the versioned key', () => {
    const storage = {
      getItem: vi.fn(() => 'stored'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }
    const adapter = new BrowserLocalStorageTemporaryProjectAdapter(() => storage)

    expect(adapter.read()).toBe('stored')
    adapter.write('{"source":"text"}')
    adapter.remove()

    expect(storage.getItem).toHaveBeenCalledWith(TEMPORARY_PROJECT_STORAGE_KEY)
    expect(storage.setItem).toHaveBeenCalledWith(
      TEMPORARY_PROJECT_STORAGE_KEY,
      '{"source":"text"}',
    )
    expect(storage.removeItem).toHaveBeenCalledWith(TEMPORARY_PROJECT_STORAGE_KEY)
  })

  it('lets the Application boundary normalize storage access failures', () => {
    const adapter = new BrowserLocalStorageTemporaryProjectAdapter(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })

    expect(() => adapter.read()).toThrowError('Blocked')
    expect(() => adapter.write('value')).toThrowError('Blocked')
    expect(() => adapter.remove()).toThrowError('Blocked')
  })

  it('isolates every operation when bootstrap supplies a Project slot key', () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }
    const isolatedKey = `${TEMPORARY_PROJECT_STORAGE_KEY}:550e8400-e29b-41d4-a716-446655440000`
    const adapter = new BrowserLocalStorageTemporaryProjectAdapter(
      () => storage,
      isolatedKey,
    )

    adapter.read()
    adapter.write('value')
    adapter.remove()

    expect(storage.getItem).toHaveBeenCalledWith(isolatedKey)
    expect(storage.setItem).toHaveBeenCalledWith(isolatedKey, 'value')
    expect(storage.removeItem).toHaveBeenCalledWith(isolatedKey)
  })
})
