export const MAX_PROJECT_FILE_BYTES = 5 * 1024 * 1024
export const DEFAULT_PNG_SCALE = 2
export const MAX_PNG_DIMENSION = 8192

export type DownloadFormat = 'granvas' | 'svg' | 'png' | 'pdf'
export type VisualDownloadFormat = Exclude<DownloadFormat, 'granvas'>

export type TransferBounds = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

export type PngRenderSize = Readonly<{
  scale: number
  pixelWidth: number
  pixelHeight: number
  limited: boolean
}>

export type TransferPolicyErrorCode =
  | 'invalid-project-extension'
  | 'invalid-project-size'
  | 'project-too-large'
  | 'invalid-graph-bounds'

export class TransferPolicyError extends Error {
  readonly code: TransferPolicyErrorCode

  constructor(code: TransferPolicyErrorCode, message: string) {
    super(message)
    this.name = 'TransferPolicyError'
    this.code = code
  }
}

const formatExtension: Readonly<Record<DownloadFormat, string>> = Object.freeze({
  granvas: 'granvas',
  svg: 'svg',
  png: 'png',
  pdf: 'pdf',
})

const formatMimeType: Readonly<Record<DownloadFormat, string>> = Object.freeze({
  granvas: 'text/plain;charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  pdf: 'application/pdf',
})

const supportedExtensionPattern = /\.(?:granvas|svg|png|pdf)$/iu
const windowsReservedNamePattern = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu
const reservedFileNameCharacters = new Set(['/','\\', ':', '*', '?', '"', '<', '>', '|'])

function trimUnsafeEdges(value: string): string {
  return value.replace(/^[\s.]+|[\s.]+$/gu, '')
}

export function fileExtensionFor(format: DownloadFormat): string {
  return formatExtension[format]
}

export function mimeTypeFor(format: DownloadFormat): string {
  return formatMimeType[format]
}

export function sanitizeDownloadBaseName(input: string): string {
  const withoutKnownExtension = input.trim().replace(supportedExtensionPattern, '')
  const replacedUnsafeCharacters = Array.from(withoutKnownExtension.normalize('NFC'))
    .map((character) => {
      const codePoint = character.codePointAt(0)!
      return codePoint <= 31 ||
        codePoint === 127 ||
        reservedFileNameCharacters.has(character)
        ? '-'
        : character
    })
    .join('')
  const sanitized = trimUnsafeEdges(
    replacedUnsafeCharacters,
  )
  const fallback = sanitized.length === 0 ? 'untitled' : sanitized

  return windowsReservedNamePattern.test(fallback) ? `_${fallback}` : fallback
}

export function createDownloadFileName(
  input: string,
  format: DownloadFormat,
): string {
  return `${sanitizeDownloadBaseName(input)}.${fileExtensionFor(format)}`
}

export function projectNameFromFileName(fileName: string): string {
  return sanitizeDownloadBaseName(fileName)
}

export function validateProjectFileMetadata(
  fileName: string,
  size: number,
): void {
  if (!fileName.toLocaleLowerCase('en-US').endsWith('.granvas')) {
    throw new TransferPolicyError(
      'invalid-project-extension',
      'Project files must use the .granvas extension.',
    )
  }

  if (!Number.isSafeInteger(size) || size < 0) {
    throw new TransferPolicyError(
      'invalid-project-size',
      'Project file size must be a non-negative safe integer.',
    )
  }

  if (size > MAX_PROJECT_FILE_BYTES) {
    throw new TransferPolicyError(
      'project-too-large',
      'Project files must not exceed 5 MiB.',
    )
  }
}

export function validateProjectBytes(bytes: Uint8Array): void {
  if (bytes.byteLength > MAX_PROJECT_FILE_BYTES) {
    throw new TransferPolicyError(
      'project-too-large',
      'Project files must not exceed 5 MiB.',
    )
  }
}

export function createPngRenderSize(bounds: TransferBounds): PngRenderSize {
  if (
    ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    throw new TransferPolicyError(
      'invalid-graph-bounds',
      'Graph export bounds must be finite and have a positive size.',
    )
  }

  const scale = Math.min(
    DEFAULT_PNG_SCALE,
    MAX_PNG_DIMENSION / bounds.width,
    MAX_PNG_DIMENSION / bounds.height,
  )

  return Object.freeze({
    scale,
    pixelWidth: Math.min(
      MAX_PNG_DIMENSION,
      Math.max(1, Math.ceil(bounds.width * scale)),
    ),
    pixelHeight: Math.min(
      MAX_PNG_DIMENSION,
      Math.max(1, Math.ceil(bounds.height * scale)),
    ),
    limited: scale < DEFAULT_PNG_SCALE,
  })
}
