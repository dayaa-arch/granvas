import {
  TransferPolicyError,
  createDownloadFileName,
  mimeTypeFor,
  projectNameFromFileName,
  validateProjectBytes,
  validateProjectFileMetadata,
  type DownloadFormat,
  type TransferPolicyErrorCode,
  type VisualDownloadFormat,
} from '@/modules/transfer/domain/TransferPolicy'

export type PickedProjectFileDto = Readonly<{
  name: string
  size: number
  readBytes(): Promise<Uint8Array>
}>

export interface ProjectFilePickerPort {
  pickProjectFile(): Promise<PickedProjectFileDto | null>
}

export type DownloadFileDto = Readonly<{
  fileName: string
  mimeType: string
  bytes: Uint8Array
}>

export interface FileDownloadPort {
  download(file: DownloadFileDto): Promise<void>
}

export type TransferGraphCertaintyDto =
  | 'neutral'
  | 'tentative'
  | 'confirmed'
  | 'rejected'

export type TransferGraphNodeDto = Readonly<{
  id: string
  label: string
  type: string
  certainty: TransferGraphCertaintyDto
  x: number
  y: number
  width: number
  height: number
}>

export type TransferGraphEdgeDto = Readonly<{
  id: string
  source: string
  target: string
  label?: string
  certainty: TransferGraphCertaintyDto
}>

export type TransferGraphGroupDto = Readonly<{
  id: string
  name: string
  memberNodeIds: readonly string[]
  x: number
  y: number
  width: number
  height: number
}>

export type TransferGraphExportSceneDto = Readonly<{
  revision: number
  graph: Readonly<{
    revision: number
    nodes: readonly TransferGraphNodeDto[]
    edges: readonly TransferGraphEdgeDto[]
    groups: readonly TransferGraphGroupDto[]
  }>
  bounds: Readonly<{
    x: number
    y: number
    width: number
    height: number
  }>
  theme: 'light'
}>

export type RenderedGraphFileDto = Readonly<{
  bytes: Uint8Array
  notices: readonly string[]
}>

export interface GraphExportPort {
  render(
    scene: TransferGraphExportSceneDto,
    format: VisualDownloadFormat,
  ): Promise<RenderedGraphFileDto>
}

export type ImportedProjectDto = Readonly<{
  name: string
  source: string
}>

export type TransferApplicationErrorCode =
  | TransferPolicyErrorCode
  | 'invalid-utf8'
  | 'project-read-failed'
  | 'graph-render-failed'
  | 'download-failed'

export class TransferApplicationError extends Error {
  readonly code: TransferApplicationErrorCode

  constructor(code: TransferApplicationErrorCode, message: string) {
    super(message)
    this.name = 'TransferApplicationError'
    this.code = code
  }
}

export type TransferErrorResultDto = Readonly<{
  type: 'error'
  code: TransferApplicationErrorCode
  message: string
}>

export type ImportProjectResultDto =
  | Readonly<{ type: 'cancelled' }>
  | Readonly<{ type: 'imported'; project: ImportedProjectDto }>
  | TransferErrorResultDto

export type DownloadResultDto =
  | Readonly<{
      type: 'downloaded'
      file: DownloadFileDto
      notices: readonly string[]
    }>
  | TransferErrorResultDto

export type DownloadProjectInputDto = Readonly<{
  name: string
  source: string
}>

export type DownloadGraphInputDto = Readonly<{
  name: string
  format: VisualDownloadFormat
  scene: TransferGraphExportSceneDto
}>

export type CreateTransferApplicationInput = Readonly<{
  projectFilePicker: ProjectFilePickerPort
  fileDownload: FileDownloadPort
  graphExport: GraphExportPort
}>

export interface TransferApplication {
  importProjectFile(): Promise<ImportProjectResultDto>
  downloadProject(input: DownloadProjectInputDto): Promise<DownloadResultDto>
  downloadGraph(input: DownloadGraphInputDto): Promise<DownloadResultDto>
}

function applicationError(
  error: unknown,
  fallbackCode: TransferApplicationErrorCode,
  fallbackMessage: string,
): TransferApplicationError {
  if (error instanceof TransferApplicationError) {
    return error
  }

  if (error instanceof TransferPolicyError) {
    return new TransferApplicationError(error.code, error.message)
  }

  return new TransferApplicationError(
    fallbackCode,
    error instanceof Error ? error.message : fallbackMessage,
  )
}

function errorResult(error: TransferApplicationError): TransferErrorResultDto {
  return Object.freeze({
    type: 'error',
    code: error.code,
    message: error.message,
  })
}

function cloneBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes)
}

function createDownloadFile(
  name: string,
  format: DownloadFormat,
  bytes: Uint8Array,
): DownloadFileDto {
  return Object.freeze({
    fileName: createDownloadFileName(name, format),
    mimeType: mimeTypeFor(format),
    bytes: cloneBytes(bytes),
  })
}

export function decodeProjectBytes(bytes: Uint8Array): string {
  validateProjectBytes(bytes)

  try {
    const decoded = new TextDecoder('utf-8', {
      fatal: true,
      ignoreBOM: true,
    }).decode(bytes)

    return decoded.startsWith('\uFEFF') ? decoded.slice(1) : decoded
  } catch (error) {
    throw applicationError(
      error,
      'invalid-utf8',
      'Project file is not valid UTF-8.',
    )
  }
}

export async function importProjectFile(
  projectFilePicker: ProjectFilePickerPort,
): Promise<ImportProjectResultDto> {
  let picked: PickedProjectFileDto | null

  try {
    picked = await projectFilePicker.pickProjectFile()
  } catch (error) {
    return errorResult(
      applicationError(error, 'project-read-failed', 'Project file selection failed.'),
    )
  }

  if (picked === null) {
    return Object.freeze({ type: 'cancelled' })
  }

  try {
    validateProjectFileMetadata(picked.name, picked.size)
  } catch (error) {
    return errorResult(
      applicationError(error, 'project-read-failed', 'Project file validation failed.'),
    )
  }

  try {
    const bytes = await picked.readBytes()
    const source = decodeProjectBytes(bytes)

    return Object.freeze({
      type: 'imported',
      project: Object.freeze({
        name: projectNameFromFileName(picked.name),
        source,
      }),
    })
  } catch (error) {
    return errorResult(
      applicationError(error, 'project-read-failed', 'Project file could not be read.'),
    )
  }
}

export async function downloadProject(
  input: DownloadProjectInputDto,
  fileDownload: FileDownloadPort,
): Promise<DownloadResultDto> {
  const file = createDownloadFile(
    input.name,
    'granvas',
    new TextEncoder().encode(input.source),
  )

  try {
    await fileDownload.download(file)
    return Object.freeze({
      type: 'downloaded',
      file,
      notices: Object.freeze([]),
    })
  } catch (error) {
    return errorResult(
      applicationError(error, 'download-failed', 'Project download could not start.'),
    )
  }
}

export async function downloadGraph(
  input: DownloadGraphInputDto,
  graphExport: GraphExportPort,
  fileDownload: FileDownloadPort,
): Promise<DownloadResultDto> {
  let rendered: RenderedGraphFileDto

  try {
    rendered = await graphExport.render(input.scene, input.format)
  } catch (error) {
    return errorResult(
      applicationError(error, 'graph-render-failed', 'Graph export failed.'),
    )
  }

  const file = createDownloadFile(input.name, input.format, rendered.bytes)

  try {
    await fileDownload.download(file)
    return Object.freeze({
      type: 'downloaded',
      file,
      notices: Object.freeze([...rendered.notices]),
    })
  } catch (error) {
    return errorResult(
      applicationError(error, 'download-failed', 'Graph download could not start.'),
    )
  }
}

export function createTransferApplication(
  input: CreateTransferApplicationInput,
): TransferApplication {
  return Object.freeze({
    importProjectFile: () => importProjectFile(input.projectFilePicker),
    downloadProject: (project: DownloadProjectInputDto) =>
      downloadProject(project, input.fileDownload),
    downloadGraph: (graph: DownloadGraphInputDto) =>
      downloadGraph(graph, input.graphExport, input.fileDownload),
  })
}
