import { describe, expect, it } from 'vitest'

import {
  beginGranvasProjectDownload,
  createGranvasDocument,
  dismissGranvasDocumentError,
  isDocumentDirty,
  markGranvasProjectDownloadFailed,
  markGranvasProjectDownloaded,
  reconstituteGranvasDocument,
  replaceGranvasDocumentSource,
  updateGranvasDocumentSource,
} from './GranvasDocument'

describe('GranvasDocument', () => {
  it('creates an immutable clean document at revision zero', () => {
    const document = createGranvasDocument({
      name: 'untitled',
      source: 'Write thoughts. See structure.',
    })

    expect(document).toEqual({
      name: 'untitled',
      source: 'Write thoughts. See structure.',
      revision: 0,
      cleanBaselineRevision: 0,
      lifecycle: { status: 'stable' },
    })
    expect(isDocumentDirty(document)).toBe(false)
    expect(Object.isFrozen(document)).toBe(true)
    expect(Object.isFrozen(document.lifecycle)).toBe(true)
  })

  it('increments revision and preserves the exact source on every update', () => {
    const original = createGranvasDocument({ name: 'notes', source: '' })
    const first = updateGranvasDocumentSource(original, '😀\r\n[idea] Granvas')
    const second = updateGranvasDocumentSource(first, '😀\r\n[idea] Granvas')

    expect(original).toMatchObject({ source: '', revision: 0 })
    expect(first).toMatchObject({
      source: '😀\r\n[idea] Granvas',
      revision: 1,
      cleanBaselineRevision: 0,
    })
    expect(second.revision).toBe(2)
    expect(isDocumentDirty(first)).toBe(true)
    expect(isDocumentDirty(second)).toBe(true)
  })

  it('replaces the active project and establishes a new clean baseline', () => {
    const dirty = updateGranvasDocumentSource(
      createGranvasDocument({ name: 'old', source: 'old source' }),
      'unsaved source',
    )

    const replaced = replaceGranvasDocumentSource(dirty, {
      name: 'imported',
      source: 'imported\r\nsource',
    })

    expect(replaced).toEqual({
      name: 'imported',
      source: 'imported\r\nsource',
      revision: 2,
      cleanBaselineRevision: 2,
      lifecycle: { status: 'stable' },
    })
    expect(isDocumentDirty(replaced)).toBe(false)
  })

  it('marks the current downloaded revision as clean', () => {
    const dirty = updateGranvasDocumentSource(
      createGranvasDocument({ name: 'notes', source: '' }),
      'saved source',
    )
    const exporting = beginGranvasProjectDownload(dirty)
    const downloaded = markGranvasProjectDownloaded(exporting, 1)

    expect(exporting.lifecycle).toEqual({ status: 'exporting', revision: 1 })
    expect(downloaded.cleanBaselineRevision).toBe(1)
    expect(downloaded.lifecycle).toEqual({ status: 'stable' })
    expect(isDocumentDirty(downloaded)).toBe(false)
  })

  it('keeps edits dirty when an older export succeeds', () => {
    const revisionOne = updateGranvasDocumentSource(
      createGranvasDocument({ name: 'notes', source: '' }),
      'downloaded revision',
    )
    const exporting = beginGranvasProjectDownload(revisionOne)
    const revisionTwo = updateGranvasDocumentSource(exporting, 'new unsaved edit')
    const downloaded = markGranvasProjectDownloaded(revisionTwo, 1)

    expect(revisionTwo.lifecycle).toEqual({ status: 'exporting', revision: 1 })
    expect(revisionTwo.revision).toBe(2)
    expect(downloaded).toMatchObject({
      source: 'new unsaved edit',
      revision: 2,
      cleanBaselineRevision: 1,
      lifecycle: { status: 'stable' },
    })
    expect(isDocumentDirty(downloaded)).toBe(true)
  })

  it('preserves document content and baseline on failure, then dismisses the error', () => {
    const dirty = updateGranvasDocumentSource(
      createGranvasDocument({ name: 'notes', source: '' }),
      'unsaved source',
    )
    const exporting = beginGranvasProjectDownload(dirty)
    const failed = markGranvasProjectDownloadFailed(
      exporting,
      1,
      'Download was rejected.',
    )
    const dismissed = dismissGranvasDocumentError(failed)

    expect(failed).toMatchObject({
      source: 'unsaved source',
      revision: 1,
      cleanBaselineRevision: 0,
      lifecycle: { status: 'error', message: 'Download was rejected.' },
    })
    expect(dismissed.lifecycle).toEqual({ status: 'stable' })
    expect(isDocumentDirty(dismissed)).toBe(true)
  })

  it('returns to clean after dismissing an error on a clean document', () => {
    const clean = createGranvasDocument({ name: 'notes', source: 'saved' })
    const exporting = beginGranvasProjectDownload(clean)
    const failed = markGranvasProjectDownloadFailed(exporting, 0, 'Failed')

    expect(isDocumentDirty(dismissGranvasDocumentError(failed))).toBe(false)
  })

  it('clears an error on source update and clears an export on project replacement', () => {
    const clean = createGranvasDocument({ name: 'notes', source: '' })
    const failed = markGranvasProjectDownloadFailed(
      beginGranvasProjectDownload(clean),
      0,
      'Failed',
    )
    const edited = updateGranvasDocumentSource(failed, 'edit after failure')
    const replaced = replaceGranvasDocumentSource(
      beginGranvasProjectDownload(edited),
      { name: 'replacement', source: 'replacement source' },
    )

    expect(edited.lifecycle).toEqual({ status: 'stable' })
    expect(isDocumentDirty(edited)).toBe(true)
    expect(replaced.lifecycle).toEqual({ status: 'stable' })
    expect(isDocumentDirty(replaced)).toBe(false)
  })

  it('rejects overlapping, missing, and stale download transitions', () => {
    const clean = createGranvasDocument({ name: 'notes', source: '' })
    const exporting = beginGranvasProjectDownload(clean)

    expect(() => beginGranvasProjectDownload(exporting)).toThrowError(
      expect.objectContaining({
        code: 'download-already-in-progress',
      }),
    )
    expect(() => markGranvasProjectDownloaded(clean, 0)).toThrowError(
      expect.objectContaining({
        code: 'download-not-in-progress',
      }),
    )
    expect(() => markGranvasProjectDownloaded(exporting, 1)).toThrowError(
      expect.objectContaining({
        code: 'download-revision-mismatch',
      }),
    )
    expect(() => dismissGranvasDocumentError(clean)).toThrowError(
      expect.objectContaining({
        code: 'document-not-in-error',
      }),
    )
  })

  it('rejects invalid reconstituted state and revision overflow', () => {
    expect(() =>
      reconstituteGranvasDocument({
        name: 'notes',
        source: '',
        revision: 1,
        cleanBaselineRevision: 2,
        lifecycle: { status: 'stable' },
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'invalid-clean-baseline',
      }),
    )

    expect(() =>
      reconstituteGranvasDocument({
        name: 'notes',
        source: '',
        revision: 0,
        cleanBaselineRevision: 0,
        lifecycle: { status: 'error', message: '   ' },
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'invalid-error-message',
      }),
    )

    const exhausted = reconstituteGranvasDocument({
      name: 'notes',
      source: '',
      revision: Number.MAX_SAFE_INTEGER,
      cleanBaselineRevision: 0,
      lifecycle: { status: 'stable' },
    })

    expect(() => updateGranvasDocumentSource(exhausted, 'next')).toThrowError(
      expect.objectContaining({
        code: 'revision-exhausted',
      }),
    )
  })
})
