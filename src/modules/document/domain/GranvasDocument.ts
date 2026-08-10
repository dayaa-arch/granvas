export type DocumentRevision = number

export type DocumentLifecycle =
  | Readonly<{ status: 'stable' }>
  | Readonly<{ status: 'exporting'; revision: DocumentRevision }>
  | Readonly<{ status: 'error'; message: string }>

export type GranvasDocument = Readonly<{
  name: string
  source: string
  revision: DocumentRevision
  cleanBaselineRevision: DocumentRevision
  lifecycle: DocumentLifecycle
}>

export type DocumentTransitionErrorCode =
  | 'invalid-document-name'
  | 'invalid-revision'
  | 'invalid-clean-baseline'
  | 'invalid-export-revision'
  | 'invalid-error-message'
  | 'revision-exhausted'
  | 'download-already-in-progress'
  | 'download-not-in-progress'
  | 'download-revision-mismatch'
  | 'document-not-in-error'

export class DocumentTransitionError extends Error {
  readonly code: DocumentTransitionErrorCode

  constructor(code: DocumentTransitionErrorCode, message: string) {
    super(message)
    this.name = 'DocumentTransitionError'
    this.code = code
  }
}

export type CreateGranvasDocumentInput = Readonly<{
  name: string
  source: string
}>

export type ReconstituteGranvasDocumentInput = Readonly<{
  name: string
  source: string
  revision: DocumentRevision
  cleanBaselineRevision: DocumentRevision
  lifecycle: DocumentLifecycle
}>

const stableLifecycle = Object.freeze({ status: 'stable' } as const)

function assertDocumentName(name: string): void {
  if (name.trim().length === 0) {
    throw new DocumentTransitionError(
      'invalid-document-name',
      'Document name must not be empty.',
    )
  }
}

function assertRevision(revision: DocumentRevision): void {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new DocumentTransitionError(
      'invalid-revision',
      'Document revision must be a non-negative safe integer.',
    )
  }
}

function assertLifecycle(
  lifecycle: DocumentLifecycle,
  currentRevision: DocumentRevision,
): void {
  if (lifecycle.status === 'exporting') {
    assertRevision(lifecycle.revision)

    if (lifecycle.revision > currentRevision) {
      throw new DocumentTransitionError(
        'invalid-export-revision',
        'Export revision must not be newer than the current document revision.',
      )
    }
  }

  if (lifecycle.status === 'error' && lifecycle.message.trim().length === 0) {
    throw new DocumentTransitionError(
      'invalid-error-message',
      'Document error message must not be empty.',
    )
  }
}

function freezeLifecycle(lifecycle: DocumentLifecycle): DocumentLifecycle {
  if (lifecycle.status === 'stable') {
    return stableLifecycle
  }

  return Object.freeze({ ...lifecycle })
}

function freezeDocument(input: ReconstituteGranvasDocumentInput): GranvasDocument {
  return Object.freeze({
    ...input,
    lifecycle: freezeLifecycle(input.lifecycle),
  })
}

function nextRevision(revision: DocumentRevision): DocumentRevision {
  assertRevision(revision)

  if (revision === Number.MAX_SAFE_INTEGER) {
    throw new DocumentTransitionError(
      'revision-exhausted',
      'Document revision cannot be incremented safely.',
    )
  }

  return revision + 1
}

function assertMatchingDownload(
  document: GranvasDocument,
  revision: DocumentRevision,
): void {
  assertRevision(revision)

  if (document.lifecycle.status !== 'exporting') {
    throw new DocumentTransitionError(
      'download-not-in-progress',
      'No project download is currently in progress.',
    )
  }

  if (document.lifecycle.revision !== revision) {
    throw new DocumentTransitionError(
      'download-revision-mismatch',
      'The download completion does not match the active export revision.',
    )
  }
}

export function createGranvasDocument(
  input: CreateGranvasDocumentInput,
): GranvasDocument {
  return reconstituteGranvasDocument({
    name: input.name,
    source: input.source,
    revision: 0,
    cleanBaselineRevision: 0,
    lifecycle: stableLifecycle,
  })
}

export function reconstituteGranvasDocument(
  input: ReconstituteGranvasDocumentInput,
): GranvasDocument {
  assertDocumentName(input.name)
  assertRevision(input.revision)
  assertRevision(input.cleanBaselineRevision)

  if (input.cleanBaselineRevision > input.revision) {
    throw new DocumentTransitionError(
      'invalid-clean-baseline',
      'Clean baseline revision must not be newer than the current revision.',
    )
  }

  assertLifecycle(input.lifecycle, input.revision)

  return freezeDocument(input)
}

export function isDocumentDirty(document: GranvasDocument): boolean {
  return document.revision !== document.cleanBaselineRevision
}

export function updateGranvasDocumentSource(
  document: GranvasDocument,
  source: string,
): GranvasDocument {
  const lifecycle =
    document.lifecycle.status === 'exporting' ? document.lifecycle : stableLifecycle

  return reconstituteGranvasDocument({
    ...document,
    source,
    revision: nextRevision(document.revision),
    lifecycle,
  })
}

export function replaceGranvasDocumentSource(
  document: GranvasDocument,
  input: CreateGranvasDocumentInput,
): GranvasDocument {
  const revision = nextRevision(document.revision)

  return reconstituteGranvasDocument({
    name: input.name,
    source: input.source,
    revision,
    cleanBaselineRevision: revision,
    lifecycle: stableLifecycle,
  })
}

export function beginGranvasProjectDownload(
  document: GranvasDocument,
): GranvasDocument {
  if (document.lifecycle.status === 'exporting') {
    throw new DocumentTransitionError(
      'download-already-in-progress',
      'A project download is already in progress.',
    )
  }

  return reconstituteGranvasDocument({
    ...document,
    lifecycle: {
      status: 'exporting',
      revision: document.revision,
    },
  })
}

export function markGranvasProjectDownloaded(
  document: GranvasDocument,
  revision: DocumentRevision,
): GranvasDocument {
  assertMatchingDownload(document, revision)

  return reconstituteGranvasDocument({
    ...document,
    cleanBaselineRevision: revision,
    lifecycle: stableLifecycle,
  })
}

export function markGranvasProjectDownloadFailed(
  document: GranvasDocument,
  revision: DocumentRevision,
  message: string,
): GranvasDocument {
  assertMatchingDownload(document, revision)

  return reconstituteGranvasDocument({
    ...document,
    lifecycle: {
      status: 'error',
      message,
    },
  })
}

export function dismissGranvasDocumentError(
  document: GranvasDocument,
): GranvasDocument {
  if (document.lifecycle.status !== 'error') {
    throw new DocumentTransitionError(
      'document-not-in-error',
      'The document does not have an active error.',
    )
  }

  return reconstituteGranvasDocument({
    ...document,
    lifecycle: stableLifecycle,
  })
}
