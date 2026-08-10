import { describe, expect, it, vi } from 'vitest'

import { BrowserFileDownloadAdapter } from './BrowserFileDownloadAdapter'
import { BrowserProjectFilePickerAdapter } from './BrowserProjectFilePickerAdapter'

describe('BrowserProjectFilePickerAdapter', () => {
  it('maps a selected browser File to a lazy framework-neutral DTO', async () => {
    const input = document.createElement('input')
    const bytes = new TextEncoder().encode('[node] Browser file')
    const arrayBuffer = vi.fn(async () => new Uint8Array(bytes).buffer)
    const file = {
      name: 'browser.granvas',
      size: bytes.byteLength,
      arrayBuffer,
    } as unknown as File
    const files = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
    } as unknown as FileList
    Object.defineProperty(input, 'files', { value: files })
    input.click = () => input.dispatchEvent(new Event('change'))

    const adapter = new BrowserProjectFilePickerAdapter(() => input)
    const picked = await adapter.pickProjectFile()

    expect(input.accept).toContain('.granvas')
    expect(picked).toMatchObject({
      name: 'browser.granvas',
      size: bytes.byteLength,
    })
    expect(arrayBuffer).not.toHaveBeenCalled()
    expect(Array.from((await picked?.readBytes()) ?? [])).toEqual(Array.from(bytes))
    expect(arrayBuffer).toHaveBeenCalledOnce()
  })

  it('returns null when the browser picker is cancelled', async () => {
    const input = document.createElement('input')
    input.click = () => input.dispatchEvent(new Event('cancel'))
    const adapter = new BrowserProjectFilePickerAdapter(() => input)

    await expect(adapter.pickProjectFile()).resolves.toBeNull()
  })
})

describe('BrowserFileDownloadAdapter', () => {
  it('creates a Blob, activates an anchor, and revokes the object URL', async () => {
    const anchor = document.createElement('a')
    const click = vi.fn()
    anchor.click = click
    const revokeObjectUrl = vi.fn()
    const appendAnchor = vi.fn()
    const createBlob = vi.fn(
      (bytes: Uint8Array, mimeType: string) =>
        new Blob([new Uint8Array(bytes).buffer], { type: mimeType }),
    )
    const adapter = new BrowserFileDownloadAdapter({
      createBlob,
      createObjectUrl: () => 'blob:granvas-test',
      revokeObjectUrl,
      createAnchor: () => anchor,
      appendAnchor,
      scheduleCleanup: (cleanup) => cleanup(),
    })

    await adapter.download({
      fileName: 'safe.granvas',
      mimeType: 'text/plain;charset=utf-8',
      bytes: new TextEncoder().encode('source'),
    })

    expect(createBlob).toHaveBeenCalledOnce()
    expect(anchor.href).toBe('blob:granvas-test')
    expect(anchor.download).toBe('safe.granvas')
    expect(appendAnchor).toHaveBeenCalledWith(anchor)
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:granvas-test')
  })

  it('revokes immediately when browser activation fails', async () => {
    const anchor = document.createElement('a')
    anchor.click = () => {
      throw new Error('blocked')
    }
    const revokeObjectUrl = vi.fn()
    const adapter = new BrowserFileDownloadAdapter({
      createBlob: () => new Blob(),
      createObjectUrl: () => 'blob:failed',
      revokeObjectUrl,
      createAnchor: () => anchor,
      appendAnchor: () => undefined,
      scheduleCleanup: vi.fn(),
    })

    await expect(
      adapter.download({
        fileName: 'failed.svg',
        mimeType: 'image/svg+xml',
        bytes: new Uint8Array(),
      }),
    ).rejects.toThrow('blocked')
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:failed')
  })
})
