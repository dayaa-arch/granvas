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
})
