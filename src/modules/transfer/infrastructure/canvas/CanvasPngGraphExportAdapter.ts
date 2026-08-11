import {
  TransferApplicationError,
  type GraphExportPort,
  type RenderedGraphFileDto,
  type TransferGraphExportSceneDto,
} from '@/modules/transfer/application/TransferApplication'
import {
  createPngRenderSize,
  type PngRenderSize,
} from '@/modules/transfer/domain/TransferPolicy'
import { renderGraphSceneToSvg } from '@/modules/transfer/infrastructure/svg/SvgGraphExportAdapter'

export type RasterizedPngDto = Readonly<{
  bytes: Uint8Array
  notices: readonly string[]
  size: PngRenderSize
}>

export interface PngRasterPort {
  rasterize(scene: TransferGraphExportSceneDto): Promise<RasterizedPngDto>
}

export type CanvasPngEnvironment = Readonly<{
  createCanvas(): HTMLCanvasElement
  createImage(): HTMLImageElement
  createObjectUrl(blob: Blob): string
  revokeObjectUrl(url: string): void
}>

const browserEnvironment: CanvasPngEnvironment = Object.freeze({
  createCanvas: () => document.createElement('canvas'),
  createImage: () => new Image(),
  createObjectUrl: (blob) => URL.createObjectURL(blob),
  revokeObjectUrl: (url) => URL.revokeObjectURL(url),
})

function renderingError(error: unknown): TransferApplicationError {
  if (error instanceof TransferApplicationError) {
    return error
  }

  return new TransferApplicationError(
    'graph-render-failed',
    error instanceof Error ? error.message : 'PNG rendering failed.',
  )
}

function loadImage(image: HTMLImageElement, source: string): Promise<void> {
  return new Promise((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Graph SVG could not be decoded.'))
    image.src = source
  })
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('Canvas could not create a PNG Blob.'))
        return
      }
      resolve(blob)
    }, 'image/png')
  })
}

export class CanvasPngGraphExportAdapter
  implements GraphExportPort, PngRasterPort
{
  readonly #environment: CanvasPngEnvironment

  constructor(environment: CanvasPngEnvironment = browserEnvironment) {
    this.#environment = environment
  }

  async rasterize(
    scene: TransferGraphExportSceneDto,
  ): Promise<RasterizedPngDto> {
    let objectUrl: string | undefined

    try {
      const svg = renderGraphSceneToSvg(scene)
      const size = createPngRenderSize(scene.bounds)
      const svgBlob = new Blob([svg], {
        type: 'image/svg+xml;charset=utf-8',
      })
      objectUrl = this.#environment.createObjectUrl(svgBlob)

      const image = this.#environment.createImage()
      await loadImage(image, objectUrl)

      const canvas = this.#environment.createCanvas()
      canvas.width = size.pixelWidth
      canvas.height = size.pixelHeight
      const context = canvas.getContext('2d')
      if (context === null) {
        throw new Error('A 2D Canvas context is unavailable.')
      }

      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, size.pixelWidth, size.pixelHeight)
      context.drawImage(image, 0, 0, size.pixelWidth, size.pixelHeight)

      const pngBlob = await canvasToPngBlob(canvas)
      const bytes = new Uint8Array(await pngBlob.arrayBuffer())
      const notices = size.limited
        ? Object.freeze([
            `画像サイズの上限（8192px）に合わせ、${size.pixelWidth}×${size.pixelHeight}pxへ縮小しました。`,
          ])
        : Object.freeze([])

      return Object.freeze({ bytes, notices, size })
    } catch (error) {
      throw renderingError(error)
    } finally {
      if (objectUrl !== undefined) {
        this.#environment.revokeObjectUrl(objectUrl)
      }
    }
  }

  async render(
    scene: TransferGraphExportSceneDto,
    format: 'svg' | 'png' | 'pdf',
  ): Promise<RenderedGraphFileDto> {
    if (format !== 'png') {
      throw new TransferApplicationError(
        'graph-render-failed',
        `The ${format.toUpperCase()} exporter is not configured.`,
      )
    }

    const rasterized = await this.rasterize(scene)
    return Object.freeze({
      bytes: rasterized.bytes,
      notices: rasterized.notices,
    })
  }
}
