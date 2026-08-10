import { describe, expect, it } from 'vitest'

import {
  beginProjectDownload,
  createDocument,
  dismissDocumentError,
  markProjectDownloadFailed,
  markProjectDownloaded,
  replaceDocumentSource,
  updateDocumentSource,
  type GranvasDocumentDto,
} from '@/modules/document'

describe('Document published application contract', () => {
  it('creates the default single active document', () => {
    const document = createDocument()

    expect(document).toEqual({
      name: 'untitled',
      source: '',
      revision: 0,
      cleanBaselineRevision: 0,
      status: { type: 'clean' },
    })
    expect(Object.isFrozen(document)).toBe(true)
    expect(Object.isFrozen(document.status)).toBe(true)
  })

  it('updates and replaces source through immutable DTOs', () => {
    const created = createDocument({ name: 'ideas', source: 'first' })
    const updated = updateDocumentSource(created, 'second')
    const replaced = replaceDocumentSource(updated, {
      name: 'imported',
      source: '😀\r\nthird',
    })

    expect(created).toMatchObject({ source: 'first', revision: 0 })
    expect(updated).toEqual({
      name: 'ideas',
      source: 'second',
      revision: 1,
      cleanBaselineRevision: 0,
      status: { type: 'dirty' },
    })
    expect(replaced).toEqual({
      name: 'imported',
      source: '😀\r\nthird',
      revision: 2,
      cleanBaselineRevision: 2,
      status: { type: 'clean' },
    })
  })

  it('keeps a newer edit dirty when an older revision download succeeds', () => {
    const revisionOne = updateDocumentSource(createDocument(), 'revision one')
    const started = beginProjectDownload(revisionOne)
    const revisionTwo = updateDocumentSource(started.document, 'revision two')
    const completed = markProjectDownloaded(revisionTwo, started.ticket)

    expect(started).toEqual({
      document: {
        name: 'untitled',
        source: 'revision one',
        revision: 1,
        cleanBaselineRevision: 0,
        status: { type: 'exporting', revision: 1, dirty: true },
      },
      ticket: { revision: 1 },
    })
    expect(revisionTwo.status).toEqual({
      type: 'exporting',
      revision: 1,
      dirty: true,
    })
    expect(completed).toEqual({
      name: 'untitled',
      source: 'revision two',
      revision: 2,
      cleanBaselineRevision: 1,
      status: { type: 'dirty' },
    })
  })

  it('reports a failed download without changing the source or baseline', () => {
    const dirty = updateDocumentSource(createDocument(), 'unsaved')
    const started = beginProjectDownload(dirty)
    const failed = markProjectDownloadFailed(
      started.document,
      started.ticket,
      'Browser rejected the download.',
    )
    const dismissed = dismissDocumentError(failed)

    expect(failed).toEqual({
      name: 'untitled',
      source: 'unsaved',
      revision: 1,
      cleanBaselineRevision: 0,
      status: {
        type: 'error',
        message: 'Browser rejected the download.',
        dirty: true,
      },
    })
    expect(dismissed.status).toEqual({ type: 'dirty' })
  })

  it('rejects a DTO whose status conflicts with its baseline', () => {
    const invalidDocument: GranvasDocumentDto = {
      name: 'invalid',
      source: 'dirty source',
      revision: 1,
      cleanBaselineRevision: 0,
      status: { type: 'clean' },
    }

    expect(() => updateDocumentSource(invalidDocument, 'next')).toThrowError(
      expect.objectContaining({
        code: 'invalid-document-state',
      }),
    )
  })

  it('exposes typed errors for stale completion and invalid input', () => {
    const clean = createDocument()
    const started = beginProjectDownload(clean)

    expect(() =>
      markProjectDownloaded(started.document, { revision: 1 }),
    ).toThrowError(
      expect.objectContaining({
        code: 'download-revision-mismatch',
      }),
    )
    expect(() => createDocument({ name: '   ' })).toThrowError(
      expect.objectContaining({
        code: 'invalid-document-name',
      }),
    )
  })
})
