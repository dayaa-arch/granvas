import {
  DocumentTransitionError,
  beginGranvasProjectDownload,
  createGranvasDocument,
  dismissGranvasDocumentError,
  isDocumentDirty,
  markGranvasProjectDownloadFailed,
  markGranvasProjectDownloaded,
  reconstituteGranvasDocument,
  replaceGranvasDocumentSource,
  updateGranvasDocumentSource,
  type DocumentLifecycle,
  type DocumentTransitionErrorCode,
  type GranvasDocument,
} from '@/modules/document/domain/GranvasDocument'

export type DocumentStatusDto =
  | Readonly<{ type: 'clean' }>
  | Readonly<{ type: 'dirty' }>
  | Readonly<{ type: 'exporting'; revision: number; dirty: boolean }>
  | Readonly<{ type: 'error'; message: string; dirty: boolean }>

export type GranvasDocumentDto = Readonly<{
  name: string
  source: string
  revision: number
  cleanBaselineRevision: number
  status: DocumentStatusDto
}>

export type ProjectDownloadTicketDto = Readonly<{
  revision: number
}>

export type CreateDocumentInput = Readonly<{
  name?: string
  source?: string
}>

export type ReplaceDocumentSourceInput = Readonly<{
  name: string
  source: string
}>

export type BeginProjectDownloadResult = Readonly<{
  document: GranvasDocumentDto
  ticket: ProjectDownloadTicketDto
}>

export type DocumentApplicationErrorCode =
  | DocumentTransitionErrorCode
  | 'invalid-document-state'

export class DocumentApplicationError extends Error {
  readonly code: DocumentApplicationErrorCode

  constructor(code: DocumentApplicationErrorCode, message: string) {
    super(message)
    this.name = 'DocumentApplicationError'
    this.code = code
  }
}

function freezeStatus(status: DocumentStatusDto): DocumentStatusDto {
  return Object.freeze({ ...status })
}

function toDocumentStatus(document: GranvasDocument): DocumentStatusDto {
  const dirty = isDocumentDirty(document)

  if (document.lifecycle.status === 'exporting') {
    return freezeStatus({
      type: 'exporting',
      revision: document.lifecycle.revision,
      dirty,
    })
  }

  if (document.lifecycle.status === 'error') {
    return freezeStatus({
      type: 'error',
      message: document.lifecycle.message,
      dirty,
    })
  }

  return freezeStatus({ type: dirty ? 'dirty' : 'clean' })
}

function toDocumentDto(document: GranvasDocument): GranvasDocumentDto {
  return Object.freeze({
    name: document.name,
    source: document.source,
    revision: document.revision,
    cleanBaselineRevision: document.cleanBaselineRevision,
    status: toDocumentStatus(document),
  })
}

function lifecycleFromStatus(status: DocumentStatusDto): DocumentLifecycle {
  if (status.type === 'exporting') {
    return {
      status: 'exporting',
      revision: status.revision,
    }
  }

  if (status.type === 'error') {
    return {
      status: 'error',
      message: status.message,
    }
  }

  return { status: 'stable' }
}

function assertStatusMatchesBaseline(document: GranvasDocumentDto): void {
  const dirty = document.revision !== document.cleanBaselineRevision

  if (document.status.type === 'clean' && dirty) {
    throw new DocumentApplicationError(
      'invalid-document-state',
      'A clean document must match its clean baseline revision.',
    )
  }

  if (document.status.type === 'dirty' && !dirty) {
    throw new DocumentApplicationError(
      'invalid-document-state',
      'A dirty document must differ from its clean baseline revision.',
    )
  }

  if (
    (document.status.type === 'exporting' || document.status.type === 'error') &&
    document.status.dirty !== dirty
  ) {
    throw new DocumentApplicationError(
      'invalid-document-state',
      'The document status does not match its clean baseline revision.',
    )
  }
}

function fromDocumentDto(document: GranvasDocumentDto): GranvasDocument {
  assertStatusMatchesBaseline(document)

  try {
    return reconstituteGranvasDocument({
      name: document.name,
      source: document.source,
      revision: document.revision,
      cleanBaselineRevision: document.cleanBaselineRevision,
      lifecycle: lifecycleFromStatus(document.status),
    })
  } catch (error) {
    throw toApplicationError(error)
  }
}

function toApplicationError(error: unknown): DocumentApplicationError {
  if (error instanceof DocumentApplicationError) {
    return error
  }

  if (error instanceof DocumentTransitionError) {
    return new DocumentApplicationError(error.code, error.message)
  }

  return new DocumentApplicationError(
    'invalid-document-state',
    'The document state could not be processed.',
  )
}

function runTransition(
  document: GranvasDocumentDto,
  transition: (current: GranvasDocument) => GranvasDocument,
): GranvasDocumentDto {
  try {
    return toDocumentDto(transition(fromDocumentDto(document)))
  } catch (error) {
    throw toApplicationError(error)
  }
}

export function createDocument(
  input: CreateDocumentInput = {},
): GranvasDocumentDto {
  try {
    return toDocumentDto(
      createGranvasDocument({
        name: input.name ?? 'untitled',
        source: input.source ?? '',
      }),
    )
  } catch (error) {
    throw toApplicationError(error)
  }
}

export function updateDocumentSource(
  document: GranvasDocumentDto,
  source: string,
): GranvasDocumentDto {
  return runTransition(document, (current) =>
    updateGranvasDocumentSource(current, source),
  )
}

export function replaceDocumentSource(
  document: GranvasDocumentDto,
  input: ReplaceDocumentSourceInput,
): GranvasDocumentDto {
  return runTransition(document, (current) =>
    replaceGranvasDocumentSource(current, input),
  )
}

export function beginProjectDownload(
  document: GranvasDocumentDto,
): BeginProjectDownloadResult {
  const exportingDocument = runTransition(document, beginGranvasProjectDownload)

  return Object.freeze({
    document: exportingDocument,
    ticket: Object.freeze({ revision: document.revision }),
  })
}

export function markProjectDownloaded(
  document: GranvasDocumentDto,
  ticket: ProjectDownloadTicketDto,
): GranvasDocumentDto {
  return runTransition(document, (current) =>
    markGranvasProjectDownloaded(current, ticket.revision),
  )
}

export function markProjectDownloadFailed(
  document: GranvasDocumentDto,
  ticket: ProjectDownloadTicketDto,
  message: string,
): GranvasDocumentDto {
  return runTransition(document, (current) =>
    markGranvasProjectDownloadFailed(current, ticket.revision, message),
  )
}

export function dismissDocumentError(
  document: GranvasDocumentDto,
): GranvasDocumentDto {
  return runTransition(document, dismissGranvasDocumentError)
}
