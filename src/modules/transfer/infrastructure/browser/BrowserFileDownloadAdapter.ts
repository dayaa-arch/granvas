import type {
  DownloadFileDto,
  FileDownloadPort,
} from '@/modules/transfer/application/TransferApplication'

export type BrowserDownloadEnvironment = Readonly<{
  createBlob(bytes: Uint8Array, mimeType: string): Blob
  createObjectUrl(blob: Blob): string
  revokeObjectUrl(url: string): void
  createAnchor(): HTMLAnchorElement
  appendAnchor(anchor: HTMLAnchorElement): void
  scheduleCleanup(cleanup: () => void): void
}>

function defaultEnvironment(): BrowserDownloadEnvironment {
  return Object.freeze({
    createBlob(bytes: Uint8Array, mimeType: string) {
      const copied = new Uint8Array(bytes)
      return new Blob([copied.buffer], { type: mimeType })
    },
    createObjectUrl: (blob: Blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url: string) => URL.revokeObjectURL(url),
    createAnchor: () => document.createElement('a'),
    appendAnchor: (anchor: HTMLAnchorElement) => document.body.append(anchor),
    scheduleCleanup: (cleanup: () => void) => queueMicrotask(cleanup),
  })
}

export class BrowserFileDownloadAdapter implements FileDownloadPort {
  readonly #environment: BrowserDownloadEnvironment

  constructor(environment: BrowserDownloadEnvironment = defaultEnvironment()) {
    this.#environment = environment
  }

  async download(file: DownloadFileDto): Promise<void> {
    const blob = this.#environment.createBlob(file.bytes, file.mimeType)
    const objectUrl = this.#environment.createObjectUrl(blob)
    const anchor = this.#environment.createAnchor()

    try {
      anchor.href = objectUrl
      anchor.download = file.fileName
      anchor.rel = 'noopener'
      this.#environment.appendAnchor(anchor)
      anchor.click()
      anchor.remove()
    } catch (error) {
      anchor.remove()
      this.#environment.revokeObjectUrl(objectUrl)
      throw error
    }

    this.#environment.scheduleCleanup(() =>
      this.#environment.revokeObjectUrl(objectUrl),
    )
  }
}
